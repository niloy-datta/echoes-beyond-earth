using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;

/// <summary>
/// Lets automation drive an already-open Editor without UI clicks: write a
/// command into Review/Bridge/command.txt and the Editor runs it on its next
/// update, appending results to Review/Bridge/log.txt. Commands:
/// ping · repair · showcase · build · rebuild · capture · capture-before · playtest · player.
/// </summary>
[InitializeOnLoad]
public static class EchoesEditorBridge
{
    private const string PlayTestKey = "Echoes.PlayTestPending";
    private static double nextPoll;

    public static string BridgeDir => Path.GetFullPath(Path.Combine(Application.dataPath, "..", "Review", "Bridge"));
    public static string ShotsDir => Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "artifacts", "unity-mars-cinematic"));

    static EchoesEditorBridge()
    {
        Directory.CreateDirectory(BridgeDir);
        EditorApplication.update += Poll;
        EditorApplication.playModeStateChanged += OnPlayMode;
        Log($"bridge loaded (Unity {Application.unityVersion}, {SystemInfo.graphicsDeviceName}, {SystemInfo.graphicsDeviceType})");
    }

    public static void Log(string message)
    {
        Directory.CreateDirectory(BridgeDir);
        File.AppendAllText(Path.Combine(BridgeDir, "log.txt"), $"{DateTime.Now:HH:mm:ss} {message}\n");
        Debug.Log("[EchoesBridge] " + message);
    }

    private static void Poll()
    {
        if (EditorApplication.timeSinceStartup < nextPoll) return;
        nextPoll = EditorApplication.timeSinceStartup + .5;
        var file = Path.Combine(BridgeDir, "command.txt");
        if (!File.Exists(file) || EditorApplication.isCompiling || EditorApplication.isUpdating) return;
        if (EditorApplication.isPlayingOrWillChangePlaymode) return;
        var command = File.ReadAllText(file).Trim();
        File.Delete(file);
        Run(command);
    }

    private static void Run(string command)
    {
        Log("begin " + command);
        try
        {
            switch (command)
            {
                case "ping": break;
                case "repair": RoverShowcaseSetup.RepairExistingScene(); break;
                case "showcase": RoverShowcaseSetup.PrepareCurrentScene(); break;
                case "build": BuildRealLookScene.Build(); break;
                case "rebuild": BuildRealLookScene.Rebuild(); break;
                case "visual-script": RoverMissionFlowSetup.BuildAndAttachToCurrentScene(); break;
                case "capture": RealLookEditorCapture.CaptureAll(ShotsDir, ""); break;
                case "capture-before": RealLookEditorCapture.CaptureBefore(ShotsDir); break;
                case "playtest": StartPlayTest(); return;
                case "player": Log("player built: " + BuildRealLookScene.BuildWindowsVisualPreview()); break;
                default: Log("unknown command"); break;
            }
            Log("done " + command);
        }
        catch (Exception e)
        {
            Log("ERROR " + command + ": " + e);
        }
    }

    private static void StartPlayTest()
    {
        if (EditorSceneManager.GetActiveScene().path != BuildRealLookScene.ScenePath)
            EditorSceneManager.OpenScene(BuildRealLookScene.ScenePath);
        SessionState.SetBool(PlayTestKey, true);
        Log("entering Play Mode for automated test");
        EditorApplication.EnterPlaymode();
    }

    private static void OnPlayMode(PlayModeStateChange change)
    {
        if (change == PlayModeStateChange.EnteredEditMode && SessionState.GetBool(PlayTestKey + ".done", false))
        {
            SessionState.SetBool(PlayTestKey + ".done", false);
            Log("done playtest (back in Edit Mode)");
        }
        if (change != PlayModeStateChange.EnteredPlayMode || !SessionState.GetBool(PlayTestKey, false)) return;
        SessionState.SetBool(PlayTestKey, false);
        var harness = UnityEngine.Object.FindAnyObjectByType<RealLookCapture>();
        if (harness == null) { Log("ERROR playtest: no RealLookCapture in scene"); EditorApplication.ExitPlaymode(); return; }
        Log("Play Mode entered; running gameplay checks and captures");
        RealLookCapture.AutomationFinished += OnPlayTestFinished;
        harness.BeginAutomation(ShotsDir, true, true, false, "editor-playmode");
    }

    private static void OnPlayTestFinished(string report)
    {
        RealLookCapture.AutomationFinished -= OnPlayTestFinished;
        Log("playtest report: " + report);
        SessionState.SetBool(PlayTestKey + ".done", true);
        EditorApplication.ExitPlaymode();
    }
}

/// <summary>Real camera renders of the RealLook scene from the Editor (no Play Mode needed).</summary>
public static class RealLookEditorCapture
{
    [MenuItem("Echoes/Capture Review Screenshots")]
    public static void CaptureMenu() => CaptureAll(EchoesEditorBridge.ShotsDir, "");

    public static void CaptureAll(string directory, string prefix)
    {
        Directory.CreateDirectory(directory);
        var scene = EditorSceneManager.OpenScene(BuildRealLookScene.ScenePath);
        var asyncShaders = ShaderUtil.allowAsyncCompilation;
        ShaderUtil.allowAsyncCompilation = false;
        try
        {
            var director = UnityEngine.Object.FindAnyObjectByType<CinematicShotDirector>();
            var world = UnityEngine.Object.FindAnyObjectByType<MarsWorldGenerator>();
            var atmosphere = UnityEngine.Object.FindAnyObjectByType<MarsAtmosphere>();
            var explorer = UnityEngine.Object.FindAnyObjectByType<RealLookBootstrap>();
            var camera = Camera.main;
            if (director == null || camera == null || world == null) throw new InvalidOperationException("RealLook scene is missing its director, camera or world.");
            if (!world.IsGenerated) world.Regenerate();
            Physics.SyncTransforms();
            atmosphere?.RefreshProbe();
            foreach (var ps in UnityEngine.Object.FindObjectsByType<ParticleSystem>(FindObjectsSortMode.None))
                if (ps.main.loop) ps.Simulate(20f, true, true);

            var animator = explorer != null ? explorer.Explorer?.GetComponentInChildren<Animator>() : UnityEngine.Object.FindAnyObjectByType<Animator>();
            var clips = animator != null && animator.runtimeAnimatorController != null ? animator.runtimeAnimatorController.animationClips : new AnimationClip[0];
            AnimationClip Clip(string name) => clips.FirstOrDefault(c => c.name == name);
            // Pose per shot: idle for portraits, a mid-stride walk for gameplay shots.
            var poses = new (string clip, float t)[] { ("idle", 1.2f), ("idle", 2.1f), ("idle", .4f), ("walk", .3f), ("walk", .62f) };

            for (var shot = 0; shot < RealLookCapture.ShotFiles.Length; shot++)
            {
                var clip = Clip(poses[shot].clip);
                AnimationMode.StartAnimationMode();
                if (clip != null) { AnimationMode.BeginSampling(); AnimationMode.SampleAnimationClip(animator.gameObject, clip, poses[shot].t); AnimationMode.EndSampling(); }
                director.SetView(shot);
                Physics.SyncTransforms();
                var path = Path.Combine(directory, prefix + RealLookCapture.ShotFiles[shot]);
                RealLookCapture.SaveCameraRender(camera, path, 1920, 1080); // warm-up (shader/LOD/shadow caches)
                RealLookCapture.SaveCameraRender(camera, path, 1920, 1080);
                AnimationMode.StopAnimationMode();
                EchoesEditorBridge.Log($"captured {path} ({RealLookCapture.ShotFiles[shot]})");
            }

            var showcase = UnityEngine.Object.FindAnyObjectByType<RoverShowcaseController>();
            if (showcase != null)
            {
                var roverFiles = new[] { "06-rover-sojourner.png", "07-rover-spirit.png", "08-rover-opportunity.png", "09-rover-curiosity.png", "10-rover-perseverance.png" };
                for (var i = 0; i < showcase.Entries.Length; i++)
                {
                    showcase.Select(i, false);
                    director.SetView(CinematicShotDirector.ThirdPerson);
                    var path = Path.Combine(directory, prefix + roverFiles[i]);
                    RealLookCapture.SaveCameraRender(camera, path, 1920, 1080);
                    EchoesEditorBridge.Log($"captured rover {showcase.Entries[i].name}: {path}");
                }

                showcase.ToggleComparison();
                var comparisonPath = Path.Combine(directory, prefix + "11-rover-generation-comparison.png");
                RealLookCapture.SaveCameraRender(camera, comparisonPath, 1920, 1080);
                showcase.ToggleComparison();
                EchoesEditorBridge.Log("captured rover generation comparison: " + comparisonPath);
            }

            if (atmosphere != null)
            {
                var previousPipeline = QualitySettings.renderPipeline;
                atmosphere.SetPerformanceProfile();
                var performancePath = Path.Combine(directory, prefix + "12-performance-profile.png");
                RealLookCapture.SaveCameraRender(camera, performancePath, 1920, 1080);
                QualitySettings.renderPipeline = previousPipeline;
                EchoesEditorBridge.Log("captured performance graphics profile: " + performancePath);
            }
        }
        finally
        {
            ShaderUtil.allowAsyncCompilation = asyncShaders;
            if (AnimationMode.InAnimationMode()) AnimationMode.StopAnimationMode();
            EditorSceneManager.OpenScene(scene.path); // discard capture-only changes (camera pose, DoF focus)
        }
    }

    /// <summary>Renders the committed (pre-upgrade) scene from git HEAD for a before/after comparison.</summary>
    public static void CaptureBefore(string directory)
    {
        const string temp = "Assets/Scenes/__RealLook_Before.unity";
        var repo = Path.GetFullPath(Path.Combine(Application.dataPath, "..", ".."));
        var git = new System.Diagnostics.Process
        {
            StartInfo = new System.Diagnostics.ProcessStartInfo("git", "show HEAD:UnityRealLook/Assets/Scenes/RealLook.unity")
            { WorkingDirectory = repo, RedirectStandardOutput = true, UseShellExecute = false, CreateNoWindow = true },
        };
        git.Start();
        var yaml = git.StandardOutput.ReadToEnd();
        git.WaitForExit();
        if (git.ExitCode != 0 || yaml.Length < 100) throw new InvalidOperationException("git show failed");
        File.WriteAllText(temp, yaml);
        AssetDatabase.ImportAsset(temp);
        try
        {
            EditorSceneManager.OpenScene(temp);
            var camera = Camera.main ?? UnityEngine.Object.FindAnyObjectByType<Camera>();
            Directory.CreateDirectory(directory);
            var asyncShaders = ShaderUtil.allowAsyncCompilation;
            ShaderUtil.allowAsyncCompilation = false;
            RealLookCapture.SaveCameraRender(camera, Path.Combine(directory, "00-before-original-scene.png"), 1920, 1080);
            RealLookCapture.SaveCameraRender(camera, Path.Combine(directory, "00-before-original-scene.png"), 1920, 1080);
            ShaderUtil.allowAsyncCompilation = asyncShaders;
            EchoesEditorBridge.Log("captured before image from git HEAD scene");
        }
        finally
        {
            EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            AssetDatabase.DeleteAsset(temp);
            if (File.Exists(BuildRealLookScene.ScenePath)) EditorSceneManager.OpenScene(BuildRealLookScene.ScenePath);
        }
    }
}
