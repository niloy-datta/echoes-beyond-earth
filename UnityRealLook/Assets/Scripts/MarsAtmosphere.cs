using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.Rendering;

/// <summary>
/// Keeps the Mars sky in sync with the sun, keeps wind-blown dust around the
/// viewer, refreshes the local reflection probe, and switches between the
/// Performance (F4), Balanced (F5) and Cinematic (F6) render pipeline presets.
/// </summary>
[ExecuteAlways]
public sealed class MarsAtmosphere : MonoBehaviour
{
    private static readonly int SunDirection = Shader.PropertyToID("_SunDirection");

    [SerializeField] private Light sun;
    [SerializeField] private Material skyMaterial;
    [SerializeField] private Transform[] followDust;
    [SerializeField] private ReflectionProbe probe;
    [SerializeField] private RenderPipelineAsset highPreset;
    [SerializeField] private RenderPipelineAsset ultraPreset;
    [SerializeField] private RenderPipelineAsset performancePreset;
    [SerializeField] private MarsWorldGenerator world;

    public void Configure(Light sunLight, Material sky, Transform[] dust, ReflectionProbe reflection, RenderPipelineAsset high, RenderPipelineAsset ultra, MarsWorldGenerator generator, RenderPipelineAsset performance = null)
    {
        sun = sunLight;
        skyMaterial = sky;
        followDust = dust;
        probe = reflection;
        highPreset = high;
        ultraPreset = ultra;
        performancePreset = performance;
        world = generator;
    }

    private void Start()
    {
        RefreshProbe();
    }

    public void RefreshProbe()
    {
        if (probe != null) probe.RenderProbe();
    }

    private void LateUpdate()
    {
        if (sun != null && skyMaterial != null)
            skyMaterial.SetVector(SunDirection, -sun.transform.forward);

        var cam = Camera.main;
        if (cam == null || followDust == null) return;
        foreach (var dust in followDust)
        {
            if (dust == null) continue;
            var p = cam.transform.position;
            dust.position = new Vector3(p.x, world != null ? world.SampleHeight(p.x, p.z) : p.y - 1.5f, p.z);
        }

        if (!Application.isPlaying) return;
        var keyboard = Keyboard.current;
        if (keyboard == null) return;
        if (keyboard.f4Key.wasPressedThisFrame) ApplyPreset(performancePreset, "Performance");
        if (keyboard.f5Key.wasPressedThisFrame) ApplyPreset(highPreset, "High");
        if (keyboard.f6Key.wasPressedThisFrame) ApplyPreset(ultraPreset, "Ultra");
    }

    public void SetPerformanceProfile() => ApplyPreset(performancePreset, "Performance");
    public void SetBalancedProfile() => ApplyPreset(highPreset, "Balanced");
    public void SetCinematicProfile() => ApplyPreset(ultraPreset, "Cinematic");

    private void ApplyPreset(RenderPipelineAsset asset, string label)
    {
        if (asset == null) return;
        QualitySettings.renderPipeline = asset;
        if (world != null) world.SetPixelError(label == "Cinematic" ? 1.5f : label == "Balanced" ? 3f : 5f);
        Debug.Log($"[RealLook] Graphics preset: {label} ({asset.name})");
    }
}
