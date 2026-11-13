using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.LowLevel;

/// <summary>
/// Verification harness for the RealLook scene. Inactive during normal play.
/// Player: launch with -captureVisuals and/or -autotest (optional -captureDir
/// &lt;path&gt;, -quitAfterCapture). Editor Play Mode: started by the editor
/// bridge through <see cref="BeginAutomation"/>. Screenshots are real camera
/// renders; gameplay checks drive the controller through virtual Input System
/// devices; frame times are measured, never estimated.
/// </summary>
public sealed class RealLookCapture : MonoBehaviour
{
    public static readonly string[] ShotFiles =
    {
        "01-astronaut-closeup.png",
        "02-rover-details.png",
        "03-mars-wide-landscape.png",
        "04-third-person-gameplay.png",
        "05-final-cinematic.png",
    };

    public static event Action<string> AutomationFinished;

    private readonly List<string> checks = new List<string>();
    private readonly StringBuilder json = new StringBuilder();
    private bool failures;

    private void Start()
    {
        var args = Environment.GetCommandLineArgs();
        var capture = Array.IndexOf(args, "-captureVisuals") >= 0;
        var test = Array.IndexOf(args, "-autotest") >= 0;
        if (!capture && !test) return;
        var dirIndex = Array.IndexOf(args, "-captureDir");
        var dir = dirIndex >= 0 && dirIndex + 1 < args.Length ? args[dirIndex + 1] : Path.Combine(Application.dataPath, "..", "Captures");
        BeginAutomation(dir, capture, test, Array.IndexOf(args, "-quitAfterCapture") >= 0, Application.isEditor ? "editor-playmode" : "player");
    }

    public void BeginAutomation(string directory, bool capture, bool test, bool quit, string label)
    {
        RealLookBootstrap.AutomationActive = true;
        StartCoroutine(Run(directory, capture, test, quit, label));
    }

    private IEnumerator Run(string directory, bool capture, bool test, bool quit, string label)
    {
        Directory.CreateDirectory(directory);
        var director = GetComponent<CinematicShotDirector>();
        var explorer = GetComponent<RealLookBootstrap>();
        // Let streaming, shader warm-up and auto exposure settle.
        for (var i = 0; i < 90; i++) yield return null;
        yield return new WaitForSecondsRealtime(2f);

        json.Append("{\n  \"label\": \"").Append(label).Append("\",\n");
        json.Append("  \"unity\": \"").Append(Application.unityVersion).Append("\",\n");
        json.Append("  \"gpu\": \"").Append(SystemInfo.graphicsDeviceName).Append(" (").Append(SystemInfo.graphicsDeviceType).Append(")\",\n");
        json.Append("  \"quality\": \"").Append(QualitySettings.names[QualitySettings.GetQualityLevel()]).Append("\",\n");
        json.Append("  \"screen\": \"").Append(Screen.width).Append('x').Append(Screen.height).Append("\",\n");

        if (capture && director != null)
        {
            for (var shot = 0; shot < ShotFiles.Length; shot++)
            {
                director.SetView(shot);
                for (var f = 0; f < 45; f++) yield return null;
                yield return new WaitForEndOfFrame();
                var path = Path.Combine(directory, (label == "player" ? "player-" : label + "-") + ShotFiles[shot]);
                SaveCameraRender(Camera.main, path, 1920, 1080);
                checks.Add($"capture {Path.GetFileName(path)}: written");
            }
            director.SetView(CinematicShotDirector.ThirdPerson);
        }

        if (test && explorer != null && explorer.Explorer != null)
        {
            yield return GameplayTest(explorer, director);
            yield return MeasurePerformance(director);
        }

        json.Append("  \"checks\": [\n");
        for (var i = 0; i < checks.Count; i++)
            json.Append("    \"").Append(checks[i].Replace("\"", "'")).Append(i < checks.Count - 1 ? "\",\n" : "\"\n");
        json.Append("  ],\n  \"failures\": ").Append(failures ? "true" : "false").Append("\n}\n");
        var reportPath = Path.Combine(directory, label + "-runtime-report.json");
        File.WriteAllText(reportPath, json.ToString());
        Debug.Log("[RealLookCapture] Report written: " + Path.GetFullPath(reportPath) + (failures ? " (FAILURES)" : " (all checks passed)"));
        RealLookBootstrap.AutomationActive = false;
        AutomationFinished?.Invoke(reportPath);
        if (quit && !Application.isEditor) Application.Quit(failures ? 2 : 0);
    }

    public static void SaveCameraRender(Camera camera, string path, int width, int height)
    {
        var rt = RenderTexture.GetTemporary(new RenderTextureDescriptor(width, height, RenderTextureFormat.ARGB32, 24) { sRGB = true, msaaSamples = 1 });
        var previous = camera.targetTexture;
        camera.targetTexture = rt;
        camera.Render();
        camera.targetTexture = previous;
        var active = RenderTexture.active;
        RenderTexture.active = rt;
        var image = new Texture2D(width, height, TextureFormat.RGB24, false);
        image.ReadPixels(new Rect(0, 0, width, height), 0, 0);
        image.Apply();
        RenderTexture.active = active;
        RenderTexture.ReleaseTemporary(rt);
        File.WriteAllBytes(path, image.EncodeToPNG());
        if (Application.isPlaying) Destroy(image); else DestroyImmediate(image);
    }

    private void Check(string name, bool ok, string detail)
    {
        checks.Add($"{(ok ? "PASS" : "FAIL")} {name}: {detail}");
        if (!ok) failures = true;
        Debug.Log($"[RealLookCapture] {(ok ? "PASS" : "FAIL")} {name}: {detail}");
    }

    private static string F(float v) => v.ToString("0.00", CultureInfo.InvariantCulture);

    private IEnumerator GameplayTest(RealLookBootstrap explorer, CinematicShotDirector director)
    {
        var keyboard = InputSystem.AddDevice<Keyboard>("RealLookAutotestKeyboard");
        var mouse = InputSystem.AddDevice<Mouse>("RealLookAutotestMouse");
        var body = explorer.Explorer;
        var cam = Camera.main.transform;
        director?.SetView(CinematicShotDirector.ThirdPerson);
        yield return new WaitForSeconds(.5f);

        Check("grounded at spawn", explorer.IsGrounded, $"y={F(body.position.y)}");
        var terrain = FindAnyObjectByType<MarsWorldGenerator>();
        if (terrain != null)
        {
            var gap = body.position.y - terrain.SampleHeight(body.position.x, body.position.z);
            Check("boots on terrain", Mathf.Abs(gap) < .2f, $"gap={F(gap)} m");
        }

        var start = body.position;
        InputSystem.QueueStateEvent(keyboard, new KeyboardState(Key.W));
        yield return new WaitForSeconds(2.5f);
        var walked = Vector3.Distance(Flat(start), Flat(body.position));
        Check("walk (W)", walked > 2f && explorer.AnimationState == "walk", $"moved {F(walked)} m, anim={explorer.AnimationState}");

        var runStart = body.position;
        InputSystem.QueueStateEvent(keyboard, new KeyboardState(Key.W, Key.LeftShift));
        yield return new WaitForSeconds(2f);
        var ran = Vector3.Distance(Flat(runStart), Flat(body.position));
        var walkSpeed = walked / 2.5f;
        var sprintSpeed = ran / 2f;
        Check("sprint (Shift+W)", sprintSpeed > walkSpeed * 1.3f,
            $"walk={F(walkSpeed)} m/s, sprint={F(sprintSpeed)} m/s, anim={explorer.AnimationState}");
        if (terrain != null)
        {
            var gap = body.position.y - terrain.SampleHeight(body.position.x, body.position.z);
            Check("ground collision while moving", gap > -.15f && gap < .35f, $"gap={F(gap)} m");
        }

        InputSystem.QueueStateEvent(keyboard, new KeyboardState(Key.D));
        yield return new WaitForSeconds(1.2f);
        InputSystem.QueueStateEvent(keyboard, new KeyboardState());
        yield return new WaitForSeconds(1.2f);
        Check("idle after release", explorer.AnimationState == "idle" && explorer.PlanarSpeed < .05f, $"anim={explorer.AnimationState}");

        var groundY = body.position.y;
        InputSystem.QueueStateEvent(keyboard, new KeyboardState(Key.Space));
        yield return null;
        InputSystem.QueueStateEvent(keyboard, new KeyboardState());
        var peak = groundY;
        for (var t = 0f; t < 2.2f; t += Time.deltaTime)
        {
            peak = Mathf.Max(peak, body.position.y);
            yield return null;
        }
        Check("jump (Space, Mars gravity)", peak - groundY > .4f && explorer.IsGrounded, $"apex {F(peak - groundY)} m, landed={explorer.IsGrounded}");

        InputSystem.QueueStateEvent(keyboard, new KeyboardState(Key.E));
        yield return null;
        InputSystem.QueueStateEvent(keyboard, new KeyboardState());
        yield return new WaitForSeconds(.4f);
        Check("interact (E)", explorer.AnimationState == "scan" || explorer.AnimationState == "interact", $"anim={explorer.AnimationState}");
        yield return new WaitForSeconds(2.4f);

        var yawBefore = cam.eulerAngles.y;
        for (var i = 0; i < 20; i++)
        {
            InputSystem.QueueStateEvent(mouse, new MouseState { delta = new Vector2(40f, 0f) }.WithButton(MouseButton.Right));
            yield return null;
        }
        InputSystem.QueueStateEvent(mouse, new MouseState());
        yield return new WaitForSeconds(.5f);
        Check("mouse look", Mathf.Abs(Mathf.DeltaAngle(yawBefore, cam.eulerAngles.y)) > 5f, $"camera yaw changed {F(Mathf.DeltaAngle(yawBefore, cam.eulerAngles.y))} deg");

        InputSystem.QueueStateEvent(keyboard, new KeyboardState(Key.Escape));
        yield return null;
        InputSystem.QueueStateEvent(keyboard, new KeyboardState());
        yield return null;
        var pausedScale = Time.timeScale;
        InputSystem.QueueStateEvent(keyboard, new KeyboardState(Key.Escape));
        yield return null;
        InputSystem.QueueStateEvent(keyboard, new KeyboardState());
        yield return null;
        Check("pause (Esc)", pausedScale == 0f && Time.timeScale == 1f, $"paused timeScale={F(pausedScale)}, resumed={F(Time.timeScale)}");

        InputSystem.RemoveDevice(keyboard);
        InputSystem.RemoveDevice(mouse);
    }

    private IEnumerator MeasurePerformance(CinematicShotDirector director)
    {
        var keyboard = InputSystem.AddDevice<Keyboard>("RealLookPerfKeyboard");
        director?.SetView(CinematicShotDirector.ThirdPerson);
        yield return new WaitForSeconds(1f);
        var frames = new List<float>(2048);
        InputSystem.QueueStateEvent(keyboard, new KeyboardState(Key.W, Key.LeftShift));
        var end = Time.realtimeSinceStartup + 10f;
        while (Time.realtimeSinceStartup < end)
        {
            yield return null;
            frames.Add(Time.unscaledDeltaTime * 1000f);
        }
        InputSystem.QueueStateEvent(keyboard, new KeyboardState());
        InputSystem.RemoveDevice(keyboard);
        frames.Sort();
        var avg = 0f;
        foreach (var f in frames) avg += f;
        avg /= Mathf.Max(1, frames.Count);
        var p99 = frames[Mathf.Clamp(Mathf.FloorToInt(frames.Count * .99f), 0, frames.Count - 1)];
        json.Append("  \"perf_third_person_run_10s\": { \"frames\": ").Append(frames.Count)
            .Append(", \"avg_ms\": ").Append(F(avg)).Append(", \"avg_fps\": ").Append(F(1000f / avg))
            .Append(", \"p99_ms\": ").Append(F(p99)).Append(", \"max_ms\": ").Append(F(frames[frames.Count - 1]))
            .Append(", \"vsync\": ").Append(QualitySettings.vSyncCount).Append(" },\n");
        checks.Add($"perf: {frames.Count} frames, avg {F(avg)} ms ({F(1000f / avg)} fps), p99 {F(p99)} ms, vSync={QualitySettings.vSyncCount}");
    }

    private static Vector3 Flat(Vector3 v) => new Vector3(v.x, 0f, v.z);
}
