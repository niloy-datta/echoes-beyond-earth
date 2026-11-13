using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

/// <summary>
/// Builds the RealLook Mars scene from the project's assets: the rigged
/// explorer and NASA/JPL MER rover (glTFast imports), CC0 photo-scanned
/// surface materials graded to Mars albedo, a procedurally generated terrain
/// and rock field (MarsWorldGenerator), physically motivated lighting, dust and
/// cinematic camera presets. Generated materials/assets are only created when
/// missing unless "Rebuild (refresh generated assets)" is used, so manual
/// tweaks survive a normal rebuild. The previous scene file is backed up first.
/// </summary>
public static class BuildRealLookScene
{
    public const string ScenePath = "Assets/Scenes/RealLook.unity";
    private const string AstronautGlb = "Assets/Art/Models/Explorer_Astronaut.glb";
    private const string RoverGlb = "Assets/Art/Models/NASA_MER_Rover_JPL.glb";
    private const string Tex = "Assets/Art/Textures/";
    private const string Gen = "Assets/Art/Generated/";
    private const string Mat = "Assets/Art/Materials/";

    public static readonly Vector3 AstronautSpawn = new Vector3(0f, 0f, 0f);
    public const float AstronautYaw = 250f;
    public static readonly Vector3 RoverSpawn = new Vector3(-1.6f, 0f, -4.3f);
    public const float RoverYaw = 32f;
    public static readonly Vector3 Vista = new Vector3(330f, 40f, 390f);

    private static bool refresh;

    [MenuItem("Echoes/Build Real Look Scene")]
    public static void Build() => BuildInternal(false);

    [MenuItem("Echoes/Rebuild Real Look Scene (refresh generated assets)")]
    public static void Rebuild() => BuildInternal(true);

    private static void BuildInternal(bool refreshGenerated)
    {
        refresh = refreshGenerated;
        BackupScene();
        foreach (var dir in new[] { Gen, Mat, Mat + "Astronaut", Mat + "Rover" }) Directory.CreateDirectory(dir);
        ConfigureTextures();
        var (high, ultra) = ConfigurePipelines();
        var post = CreatePostProfile();
        var dofProfile = CreateDepthOfFieldProfile();
        var sky = CreateSkyMaterial();
        var layers = CreateTerrainLayers();
        var terrainMaterial = CreateTerrainMaterial();
        var rockMaterials = new[]
        {
            LitMaterial("Mars Basalt Boulder", "mars-boulder", new Color(.78f, .74f, .72f), 1.4f, .55f),
            LitMaterial("Mars Dusty Boulder", "mars-boulder", new Color(1.04f, .93f, .84f), 1.4f, .45f),
            LitMaterial("Mars Layered Outcrop", "mars-outcrop", Color.white, .9f, .4f),
        };
        var dustMaterial = CreateDustMaterial();

        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var root = new GameObject("MarsRealLook");

        var sun = CreateLighting(root.transform, sky);
        var world = CreateWorld(root.transform, terrainMaterial, layers, rockMaterials);
        var astronaut = CreateAstronaut(root.transform, world, out var animator, out var footDust, dustMaterial);
        var rover = CreateRover(root.transform, world);
        var dust = CreateAmbientDust(root.transform, dustMaterial);
        var probe = CreateReflectionProbe(root.transform, world);
        var camera = CreateCamera(root.transform, post, dofProfile, out var dofVolume);

        var explorer = root.AddComponent<RealLookBootstrap>();
        explorer.Configure(astronaut.transform, animator, rover.transform, footDust);
        var director = root.AddComponent<CinematicShotDirector>();
        director.Configure(camera, astronaut.transform, rover.transform, dofVolume, Vista);
        var atmosphere = root.AddComponent<MarsAtmosphere>();
        var performance = AssetDatabase.LoadAssetAtPath<RenderPipelineAsset>("Assets/Settings/Mobile_RPAsset.asset");
        atmosphere.Configure(sun, sky, dust, probe, high, ultra, world, performance);
        root.AddComponent<RealLookCapture>();
        RoverMissionFlowSetup.Attach(root);
        director.SetView(CinematicShotDirector.ThirdPerson);

        EditorSceneManager.SaveScene(scene, ScenePath);
        var buildScenes = EditorBuildSettings.scenes.Where(s => s.path != ScenePath).ToList();
        buildScenes.Insert(0, new EditorBuildSettingsScene(ScenePath, true));
        EditorBuildSettings.scenes = buildScenes.ToArray();
        AssetDatabase.SaveAssets();
        RoverShowcaseSetup.PrepareCurrentScene();
        Debug.Log("[RealLook] Scene built at " + ScenePath);
    }

    [MenuItem("Echoes/Build Windows Visual Preview")]
    public static string BuildWindowsVisualPreview()
    {
        var output = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".tmp", "RealLookVisualPreview", "RealLookVisualPreview.exe"));
        Directory.CreateDirectory(Path.GetDirectoryName(output));
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = new[] { ScenePath },
            locationPathName = output,
            target = BuildTarget.StandaloneWindows64,
            options = BuildOptions.None,
        });
        if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
            throw new System.InvalidOperationException("Windows visual preview build failed: " + report.summary.result);
        Debug.Log($"[RealLook] Windows preview built at {output} ({report.summary.totalSize / 1048576f:0.0} MB, {report.summary.totalTime.TotalSeconds:0} s)");
        return output;
    }

    // ------------------------------------------------------------------ safety

    private static void BackupScene()
    {
        if (!File.Exists(ScenePath)) return;
        var dir = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", ".tmp", "scene-backups"));
        Directory.CreateDirectory(dir);
        File.Copy(ScenePath, Path.Combine(dir, $"RealLook-{System.DateTime.Now:yyyyMMdd-HHmmss}.unity"), true);
        foreach (var s in UnityEngine.SceneManagement.SceneManager.GetActiveScene().isDirty
                     ? new[] { UnityEngine.SceneManagement.SceneManager.GetActiveScene() } : new UnityEngine.SceneManagement.Scene[0])
            if (!string.IsNullOrEmpty(s.path) && s.path != ScenePath)
                EditorSceneManager.SaveScene(s, Path.Combine("Assets/Scenes", Path.GetFileNameWithoutExtension(s.path) + "-autosave.unity"), true);
    }

    private static T CreateOrLoad<T>(string path, System.Func<T> create, out bool created) where T : Object
    {
        var existing = AssetDatabase.LoadAssetAtPath<T>(path);
        if (existing != null && !refresh) { created = false; return existing; }
        if (existing != null) AssetDatabase.DeleteAsset(path);
        var asset = create();
        AssetDatabase.CreateAsset(asset, path);
        created = true;
        return asset;
    }

    // ---------------------------------------------------------------- textures

    private static void ConfigureTextures()
    {
        foreach (var path in Directory.GetFiles(Tex).Select(p => p.Replace('\\', '/')).Where(p => !p.EndsWith(".meta")))
        {
            if (AssetImporter.GetAtPath(path) is not TextureImporter importer) continue;
            var name = Path.GetFileNameWithoutExtension(path);
            var normal = name.EndsWith("-normal");
            var linear = name.EndsWith("-mask");
            var changed = false;
            void Set<TV>(TV current, TV wanted, System.Action<TV> apply) { if (!EqualityComparer<TV>.Default.Equals(current, wanted)) { apply(wanted); changed = true; } }
            Set(importer.textureType, normal ? TextureImporterType.NormalMap : TextureImporterType.Default, v => importer.textureType = v);
            Set(importer.sRGBTexture, !(normal || linear), v => importer.sRGBTexture = v);
            Set(importer.maxTextureSize, 2048, v => importer.maxTextureSize = v);
            Set(importer.anisoLevel, 8, v => importer.anisoLevel = v);
            Set(importer.textureCompression, TextureImporterCompression.CompressedHQ, v => importer.textureCompression = v);
            Set(importer.mipmapEnabled, true, v => importer.mipmapEnabled = v);
            if (name == "dust-sprite") Set(importer.alphaIsTransparency, true, v => importer.alphaIsTransparency = v);
            if (changed) importer.SaveAndReimport();
        }
    }

    private static Texture2D T(string name) => AssetDatabase.LoadAssetAtPath<Texture2D>(Tex + name + (name.EndsWith("-mask") || name == "dust-sprite" ? ".png" : ".jpg"));

    // --------------------------------------------------------------- pipelines

    private static (RenderPipelineAsset high, RenderPipelineAsset ultra) ConfigurePipelines()
    {
        var ultra = PipelinePreset("Assets/Settings/Mars_Ultra_RPAsset.asset", 4096, 300f, 4, 1);
        var high = PipelinePreset("Assets/Settings/Mars_High_RPAsset.asset", 2048, 180f, 2, 0);

        // PC quality level renders with the Ultra preset; F5/F6 switch at runtime.
        var qualityAsset = AssetDatabase.LoadAllAssetsAtPath("ProjectSettings/QualitySettings.asset").FirstOrDefault();
        if (qualityAsset != null)
        {
            var so = new SerializedObject(qualityAsset);
            var levels = so.FindProperty("m_QualitySettings");
            for (var i = 0; i < levels.arraySize; i++)
            {
                var level = levels.GetArrayElementAtIndex(i);
                if (level.FindPropertyRelative("name").stringValue != "PC") continue;
                level.FindPropertyRelative("customRenderPipeline").objectReferenceValue = ultra;
                level.FindPropertyRelative("vSyncCount").intValue = 1;
                level.FindPropertyRelative("lodBias").floatValue = 2f;
            }
            so.ApplyModifiedPropertiesWithoutUndo();
        }

        // Screen-space ambient occlusion for contact darkening under boots, wheels and rocks.
        var renderer = AssetDatabase.LoadAssetAtPath<ScriptableRendererData>("Assets/Settings/PC_Renderer.asset");
        if (renderer != null)
            foreach (var feature in renderer.rendererFeatures.Where(f => f != null && f.GetType().Name == "ScreenSpaceAmbientOcclusion"))
            {
                var so = new SerializedObject(feature);
                so.FindProperty("m_Settings.Intensity").floatValue = .75f;
                so.FindProperty("m_Settings.Radius").floatValue = .35f;
                so.FindProperty("m_Settings.DirectLightingStrength").floatValue = .3f;
                so.FindProperty("m_Settings.Samples").intValue = 0;
                so.FindProperty("m_Settings.Downsample").boolValue = false;
                so.ApplyModifiedPropertiesWithoutUndo();
                feature.SetActive(true);
            }
        return (high, ultra);
    }

    private static RenderPipelineAsset PipelinePreset(string path, int shadowRes, float shadowDistance, int msaa, int hdrPrecision)
    {
        if (!File.Exists(path)) AssetDatabase.CopyAsset("Assets/Settings/PC_RPAsset.asset", path);
        var asset = AssetDatabase.LoadAssetAtPath<UniversalRenderPipelineAsset>(path);
        var so = new SerializedObject(asset);
        so.FindProperty("m_MainLightShadowmapResolution").intValue = shadowRes;
        so.FindProperty("m_ShadowDistance").floatValue = shadowDistance;
        so.FindProperty("m_ShadowCascadeCount").intValue = 4;
        so.FindProperty("m_Cascade4Split").vector3Value = new Vector3(.035f, .11f, .33f);
        so.FindProperty("m_ShadowDepthBias").floatValue = .7f;
        so.FindProperty("m_ShadowNormalBias").floatValue = .6f;
        so.FindProperty("m_SoftShadowQuality").intValue = 3;
        so.FindProperty("m_MSAA").intValue = msaa;
        so.FindProperty("m_SupportsHDR").boolValue = true;
        so.FindProperty("m_HDRColorBufferPrecision").intValue = hdrPrecision;
        so.FindProperty("m_RequireDepthTexture").boolValue = true;
        so.FindProperty("m_RenderScale").floatValue = 1f;
        so.ApplyModifiedPropertiesWithoutUndo();
        EditorUtility.SetDirty(asset);
        return asset;
    }

    // ------------------------------------------------------------------- post

    private static VolumeProfile CreatePostProfile()
    {
        return CreateOrLoad("Assets/Settings/MarsCinematicProfile.asset", () => ScriptableObject.CreateInstance<VolumeProfile>(), out var created) is var profile && created
            ? FillPost(profile) : profile;
    }

    private static VolumeProfile FillPost(VolumeProfile profile)
    {
        var tone = profile.Add<Tonemapping>(true); tone.mode.Override(TonemappingMode.ACES);
        var color = profile.Add<ColorAdjustments>(true);
        color.postExposure.Override(.45f); color.contrast.Override(9f); color.saturation.Override(-10f);
        var wb = profile.Add<WhiteBalance>(true); wb.temperature.Override(-6f); wb.tint.Override(2f);
        var smh = profile.Add<ShadowsMidtonesHighlights>(true);
        smh.shadows.Override(new Vector4(.97f, .98f, 1.03f, 0f));
        var bloom = profile.Add<Bloom>(true);
        bloom.threshold.Override(1.1f); bloom.intensity.Override(.18f); bloom.scatter.Override(.62f); bloom.highQualityFiltering.Override(true);
        var vignette = profile.Add<Vignette>(true); vignette.intensity.Override(.18f); vignette.smoothness.Override(.42f);
        var grain = profile.Add<FilmGrain>(true); grain.type.Override(FilmGrainLookup.Thin1); grain.intensity.Override(.12f); grain.response.Override(.85f);
        foreach (var component in profile.components) AssetDatabase.AddObjectToAsset(component, profile);
        EditorUtility.SetDirty(profile);
        return profile;
    }

    private static VolumeProfile CreateDepthOfFieldProfile()
    {
        var profile = CreateOrLoad("Assets/Settings/MarsCloseUpDoF.asset", () => ScriptableObject.CreateInstance<VolumeProfile>(), out var created);
        if (!created) return profile;
        var dof = profile.Add<DepthOfField>(true);
        dof.mode.Override(DepthOfFieldMode.Bokeh);
        dof.focusDistance.Override(1.7f); dof.focalLength.Override(75f); dof.aperture.Override(3.2f); dof.bladeCount.Override(7);
        foreach (var component in profile.components) AssetDatabase.AddObjectToAsset(component, profile);
        EditorUtility.SetDirty(profile);
        return profile;
    }

    // -------------------------------------------------------------- materials

    private static Material CreateSkyMaterial()
    {
        var material = CreateOrLoad(Mat + "Mars Sky.mat", () => new Material(Shader.Find("Echoes/Mars Sky")), out _);
        return material;
    }

    private static TerrainLayer[] CreateTerrainLayers()
    {
        TerrainLayer Layer(string name, float tile, float smoothMax)
        {
            return CreateOrLoad($"{Gen}{name}.terrainlayer", () => new TerrainLayer
            {
                diffuseTexture = T($"mars-{name}-albedo"),
                normalMapTexture = T($"mars-{name}-normal"),
                maskMapTexture = T($"mars-{name}-mask"),
                tileSize = new Vector2(tile, tile),
                normalScale = 1f,
                maskMapRemapMin = Vector4.zero,
                maskMapRemapMax = new Vector4(1f, 1f, 1f, smoothMax),
                metallic = 0f,
            }, out _);
        }
        return new[] { Layer("regolith", 3.2f, .55f), Layer("dust", 5.5f, .45f), Layer("outcrop", 7f, .5f), Layer("basalt", 2.6f, .55f) };
    }

    private static Material CreateTerrainMaterial()
    {
        return CreateOrLoad(Mat + "Mars Terrain.mat", () =>
        {
            var m = new Material(Shader.Find("Universal Render Pipeline/Terrain/Lit"));
            m.SetFloat("_EnableHeightBlend", 1f);
            m.SetFloat("_HeightTransition", .22f);
            m.SetFloat("_EnableInstancedPerPixelNormal", 1f);
            m.EnableKeyword("_TERRAIN_BLEND_HEIGHT");
            m.EnableKeyword("_MASKMAP");
            m.EnableKeyword("_NORMALMAP");
            m.EnableKeyword("_TERRAIN_INSTANCED_PERPIXEL_NORMAL");
            return m;
        }, out _);
    }

    private static Material LitMaterial(string name, string set, Color tint, float tiling, float smoothness)
    {
        return CreateOrLoad($"{Mat}{name}.mat", () =>
        {
            var m = new Material(Shader.Find("Universal Render Pipeline/Lit")) { enableInstancing = true };
            m.SetTexture("_BaseMap", T(set + "-albedo"));
            m.SetColor("_BaseColor", tint);
            m.SetTexture("_BumpMap", T(set + "-normal")); m.SetFloat("_BumpScale", 1.15f); m.EnableKeyword("_NORMALMAP");
            m.SetTexture("_MetallicGlossMap", T(set + "-mask")); m.EnableKeyword("_METALLICSPECGLOSSMAP");
            m.SetFloat("_Smoothness", smoothness); m.SetFloat("_SmoothnessTextureChannel", 0f);
            m.SetTexture("_OcclusionMap", T(set + "-mask")); m.SetFloat("_OcclusionStrength", 1f); m.EnableKeyword("_OCCLUSIONMAP");
            m.SetTextureScale("_BaseMap", new Vector2(tiling, tiling));
            return m;
        }, out _);
    }

    private static Material CreateDustMaterial()
    {
        return CreateOrLoad(Mat + "Mars Dust Particle.mat", () =>
        {
            var m = new Material(Shader.Find("Universal Render Pipeline/Particles/Unlit"));
            m.SetTexture("_BaseMap", T("dust-sprite"));
            m.SetColor("_BaseColor", Color.white);
            m.SetFloat("_Surface", 1f); m.SetFloat("_Blend", 0f);
            m.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha); m.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
            m.SetFloat("_ZWrite", 0f);
            m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
            m.SetFloat("_SoftParticlesEnabled", 1f); m.SetVector("_SoftParticleFadeParams", new Vector4(0f, 1f / 1.5f, 0f, 0f));
            m.SetFloat("_SoftParticlesNearFadeDistance", 0f); m.SetFloat("_SoftParticlesFarFadeDistance", 1.5f);
            m.EnableKeyword("_SOFTPARTICLES_ON");
            m.SetFloat("_CameraFadingEnabled", 1f); m.SetFloat("_CameraNearFadeDistance", .4f); m.SetFloat("_CameraFarFadeDistance", 2f);
            m.SetVector("_CameraFadeParams", new Vector4(.4f, 1f / 1.6f, 0f, 0f));
            m.EnableKeyword("_FADING_ON");
            m.renderQueue = (int)RenderQueue.Transparent;
            return m;
        }, out _);
    }

    // ------------------------------------------------------------ environment

    private static Light CreateLighting(Transform parent, Material sky)
    {
        RenderSettings.skybox = sky;
        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.Exponential;
        RenderSettings.fogDensity = .00095f;
        RenderSettings.fogColor = new Color(.72f, .56f, .43f);
        // Mars shadows stay readable: dust-laden sky scatters a large diffuse share.
        RenderSettings.ambientMode = AmbientMode.Trilight;
        RenderSettings.ambientSkyColor = new Color(.56f, .47f, .41f);
        RenderSettings.ambientEquatorColor = new Color(.52f, .39f, .3f);
        RenderSettings.ambientGroundColor = new Color(.3f, .2f, .14f);
        RenderSettings.defaultReflectionMode = DefaultReflectionMode.Skybox;
        RenderSettings.reflectionIntensity = .8f;

        var sun = new GameObject("Sun (Mars, 32° elevation)").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.color = new Color(1f, .94f, .86f);
        sun.intensity = 2.4f;
        sun.shadows = LightShadows.Soft;
        sun.shadowStrength = 1f;
        sun.transform.rotation = Quaternion.Euler(32f, 120f, 0f);
        sun.transform.SetParent(parent);
        var data = sun.gameObject.AddComponent<UniversalAdditionalLightData>();
        data.usePipelineSettings = true;
        RenderSettings.sun = sun;
        sky.SetVector("_SunDirection", -sun.transform.forward);
        return sun;
    }

    private static MarsWorldGenerator CreateWorld(Transform parent, Material terrainMaterial, TerrainLayer[] layers, Material[] rocks)
    {
        var go = new GameObject("Mars World (generated at load)");
        go.SetActive(false);
        go.transform.SetParent(parent);
        var world = go.AddComponent<MarsWorldGenerator>();
        world.Configure(terrainMaterial, layers, rocks, new[]
        {
            new Vector4(AstronautSpawn.x, AstronautSpawn.z, 3.2f, 0f),
            new Vector4(RoverSpawn.x, RoverSpawn.z, 3.4f, 0f),
            new Vector4(-1f, -2f, 2.5f, 0f),
        });
        go.SetActive(true);
        return world;
    }

    private static Vector3 Ground(MarsWorldGenerator world, Vector3 p) => new Vector3(p.x, world.SampleHeight(p.x, p.z), p.z);

    // ---------------------------------------------------------------- actors

    private static readonly Dictionary<string, (Color tint, float metallic, float roughness)> SuitSurfaces = new Dictionary<string, (Color, float, float)>
    {
        { "SuitFabric", (new Color(.93f, .91f, .87f), 0f, 1f) },          // ortho-fabric: texture roughness, dust-tinted
        { "SuitShell", (new Color(.95f, .94f, .92f), 0f, .75f) },          // hard-upper-torso composite
        { "BrushedAluminium", (new Color(.74f, .74f, .76f), 1f, .34f) },
        { "Rubber", (new Color(.1f, .095f, .09f), 0f, .86f) },
        { "GoldVisor", (new Color(1f, .78f, .42f), 1f, .05f) },
        { "MarsAmber", (new Color(.85f, .5f, .2f), 0f, .5f) },
        { "CyanLight", (new Color(.05f, .1f, .12f), 0f, .4f) },
    };

    private static readonly Dictionary<string, (float metallic, float roughness)> RoverSurfaces = new Dictionary<string, (float, float)>
    {
        { "tex_panels_n", (.25f, .32f) }, { "tex_panels2_n", (.25f, .32f) }, { "tex_instruments", (.4f, .45f) },
        { "tex_body_n", (.08f, .55f) }, { "tex_suspension_n", (.55f, .42f) }, { "Silver", (.9f, .32f) },
        { "tex_mast", (.15f, .55f) }, { "foil_silver", (.95f, .3f) }, { "tex_arm", (.45f, .45f) },
    };

    private static Material TunedCopy(Material source, string folder, System.Action<Material> tune)
    {
        var path = $"{Mat}{folder}/{source.name}.mat";
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material != null && !refresh) return material;
        if (material == null) { material = new Material(source); AssetDatabase.CreateAsset(material, path); }
        else material.CopyPropertiesFromMaterial(source);
        tune(material);
        EditorUtility.SetDirty(material);
        return material;
    }

    private static void SetIfPresent(Material m, string property, float value) { if (m.HasProperty(property)) m.SetFloat(property, value); }

    private static GameObject CreateAstronaut(Transform parent, MarsWorldGenerator world, out Animator animator, out ParticleSystem footDust, Material dustMaterial)
    {
        var root = new GameObject("Astronaut");
        root.layer = 2; // Ignore Raycast: camera and grounding probes skip the player.
        root.transform.SetParent(parent);
        root.transform.SetPositionAndRotation(Ground(world, AstronautSpawn), Quaternion.Euler(0f, AstronautYaw, 0f));
        var controller = root.AddComponent<CharacterController>();
        controller.height = 1.86f; controller.radius = .3f; controller.center = new Vector3(0f, .95f, 0f);
        controller.stepOffset = .32f; controller.slopeLimit = 48f; controller.skinWidth = .03f;

        var prefab = AssetDatabase.LoadAssetAtPath<GameObject>(AstronautGlb);
        var model = (GameObject)PrefabUtility.InstantiatePrefab(prefab, root.transform);
        model.name = "Explorer (rigged GLB)";
        model.transform.localPosition = Vector3.zero;
        model.transform.localRotation = Quaternion.identity;
        foreach (var t in model.GetComponentsInChildren<Transform>(true)) t.gameObject.layer = 2;

        foreach (var renderer in model.GetComponentsInChildren<Renderer>(true))
        {
            renderer.shadowCastingMode = ShadowCastingMode.On;
            renderer.sharedMaterials = renderer.sharedMaterials.Select(source => source == null ? null : TunedCopy(source, "Astronaut", m =>
            {
                if (!SuitSurfaces.TryGetValue(source.name, out var s)) return;
                if (m.HasProperty("baseColorFactor")) m.SetColor("baseColorFactor", s.tint);
                SetIfPresent(m, "metallicFactor", s.metallic);
                SetIfPresent(m, "roughnessFactor", s.roughness);
                if (source.name == "CyanLight" && m.HasProperty("emissiveFactor")) m.SetColor("emissiveFactor", new Color(.39f, .9f, .94f) * 3f);
            })).ToArray();
            if (renderer is SkinnedMeshRenderer skinned) skinned.updateWhenOffscreen = true;
        }

        // Feet on the ground: offset the model by the lowest vertex of the baked bind pose.
        var lowest = float.MaxValue;
        foreach (var skinned in model.GetComponentsInChildren<SkinnedMeshRenderer>())
        {
            var baked = new Mesh();
            skinned.BakeMesh(baked, true);
            foreach (var v in baked.vertices) lowest = Mathf.Min(lowest, skinned.transform.TransformPoint(v).y);
            Object.DestroyImmediate(baked);
        }
        if (lowest < float.MaxValue) model.transform.position += Vector3.up * (root.transform.position.y - lowest);

        foreach (var legacy in model.GetComponentsInChildren<Animation>()) Object.DestroyImmediate(legacy);
        animator = model.GetComponent<Animator>() ?? model.AddComponent<Animator>();
        animator.runtimeAnimatorController = CreateExplorerController();
        animator.applyRootMotion = false;
        animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;

        footDust = CreateFootstepDust(parent, dustMaterial);
        return root;
    }

    private static AnimatorController CreateExplorerController()
    {
        var path = Gen + "ExplorerLocomotion.controller";
        if (File.Exists(path)) AssetDatabase.DeleteAsset(path);
        var controller = AnimatorController.CreateAnimatorControllerAtPath(path);
        var machine = controller.layers[0].stateMachine;
        var clips = AssetDatabase.LoadAllAssetsAtPath(AstronautGlb).OfType<AnimationClip>().Where(c => !c.name.StartsWith("__preview__")).ToList();
        var oneShot = new HashSet<string> { "jump", "land", "interact", "scan", "kneel", "examine", "wave" };
        foreach (var clip in clips)
        {
            var motion = clip;
            if (oneShot.Contains(clip.name))
            {
                motion = Object.Instantiate(clip);
                motion.name = clip.name;
                var settings = AnimationUtility.GetAnimationClipSettings(motion);
                settings.loopTime = false;
                AnimationUtility.SetAnimationClipSettings(motion, settings);
                AssetDatabase.AddObjectToAsset(motion, controller);
            }
            var state = machine.AddState(clip.name);
            state.motion = motion;
            if (clip.name == "idle") machine.defaultState = state;
        }
        EditorUtility.SetDirty(controller);
        return controller;
    }

    private static GameObject CreateRover(Transform parent, MarsWorldGenerator world)
    {
        var root = new GameObject("Opportunity (MER-B) — NASA/JPL reference model");
        root.transform.SetParent(parent);
        // Rest the six wheels on the terrain: fit a plane through the wheel footprint.
        var yaw = Quaternion.Euler(0f, RoverYaw, 0f);
        var corners = new[] { new Vector3(-.6f, 0, .74f), new Vector3(.6f, 0, .74f), new Vector3(-.6f, 0, -.74f), new Vector3(.6f, 0, -.74f) }
            .Select(c => Ground(world, RoverSpawn + yaw * c)).ToArray();
        var normal = Vector3.Cross(corners[1] - corners[2], corners[0] - corners[3]).normalized;
        if (normal.y < 0) normal = -normal;
        var centre = corners.Aggregate(Vector3.zero, (a, b) => a + b) / corners.Length;
        root.transform.SetPositionAndRotation(centre - Vector3.up * .025f, Quaternion.FromToRotation(Vector3.up, normal) * yaw);

        var model = (GameObject)PrefabUtility.InstantiatePrefab(AssetDatabase.LoadAssetAtPath<GameObject>(RoverGlb), root.transform);
        model.transform.localPosition = Vector3.zero;
        model.transform.localRotation = Quaternion.identity;
        foreach (var renderer in model.GetComponentsInChildren<Renderer>(true))
        {
            renderer.shadowCastingMode = ShadowCastingMode.On;
            renderer.sharedMaterials = renderer.sharedMaterials.Select(source => source == null ? null : TunedCopy(source, "Rover", m =>
            {
                // The source model marks every surface fully metallic (chrome); use real hardware values.
                if (RoverSurfaces.TryGetValue(source.name, out var s)) { SetIfPresent(m, "metallicFactor", s.metallic); SetIfPresent(m, "roughnessFactor", s.roughness); }
                if (m.HasProperty("baseColorFactor")) m.SetColor("baseColorFactor", m.GetColor("baseColorFactor") * new Color(1f, .9f, .8f));
            })).ToArray();
        }
        var box = root.AddComponent<BoxCollider>();
        box.center = new Vector3(0f, .78f, -.08f); box.size = new Vector3(2.25f, 1.5f, 1.66f);
        return root;
    }

    // ------------------------------------------------------------------- dust

    private static ParticleSystem Particles(string name, Transform parent, Material material, int max)
    {
        var go = new GameObject(name);
        go.transform.SetParent(parent);
        var ps = go.AddComponent<ParticleSystem>();
        var renderer = go.GetComponent<ParticleSystemRenderer>();
        renderer.sharedMaterial = material;
        renderer.shadowCastingMode = ShadowCastingMode.Off;
        renderer.receiveShadows = false;
        var main = ps.main;
        main.maxParticles = max;
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        main.playOnAwake = true;
        return ps;
    }

    private static Transform[] CreateAmbientDust(Transform parent, Material material)
    {
        // Large, faint wind-blown haze sheets.
        var haze = Particles("Wind Dust Haze", parent, material, 260);
        var m = haze.main; m.loop = true; m.prewarm = true;
        m.startLifetime = new ParticleSystem.MinMaxCurve(14f, 24f); m.startSpeed = 0f;
        m.startSize = new ParticleSystem.MinMaxCurve(2f, 6f); m.startRotation = new ParticleSystem.MinMaxCurve(0f, Mathf.PI * 2f);
        m.startColor = new Color(.82f, .62f, .46f, .035f);
        var e = haze.emission; e.rateOverTime = 14f;
        var s = haze.shape; s.shapeType = ParticleSystemShapeType.Box; s.scale = new Vector3(80f, 6f, 80f); s.position = new Vector3(0f, 3f, 0f);
        var v = haze.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.World;
        v.x = new ParticleSystem.MinMaxCurve(1.2f, 2.4f); v.y = new ParticleSystem.MinMaxCurve(-.05f, .1f); v.z = new ParticleSystem.MinMaxCurve(.3f, .8f);
        FadeInOut(haze);

        // Fine sunlit motes, visible in close-ups.
        var motes = Particles("Suspended Motes", parent, material, 500);
        m = motes.main; m.loop = true; m.prewarm = true;
        m.startLifetime = new ParticleSystem.MinMaxCurve(6f, 12f); m.startSpeed = 0f;
        m.startSize = new ParticleSystem.MinMaxCurve(.008f, .03f);
        m.startColor = new Color(.95f, .8f, .64f, .5f);
        e = motes.emission; e.rateOverTime = 55f;
        s = motes.shape; s.shapeType = ParticleSystemShapeType.Box; s.scale = new Vector3(24f, 5f, 24f); s.position = new Vector3(0f, 2.4f, 0f);
        v = motes.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.World;
        v.x = new ParticleSystem.MinMaxCurve(.6f, 1.6f); v.y = new ParticleSystem.MinMaxCurve(-.05f, .05f); v.z = new ParticleSystem.MinMaxCurve(.1f, .4f);
        var noise = motes.noise; noise.enabled = true; noise.strength = .25f; noise.frequency = .4f;
        FadeInOut(motes);

        // Saltating streamers skimming the ground.
        var streamers = Particles("Ground Saltation", parent, material, 140);
        m = streamers.main; m.loop = true; m.prewarm = true;
        m.startLifetime = new ParticleSystem.MinMaxCurve(3f, 6f); m.startSpeed = 0f;
        m.startSize = new ParticleSystem.MinMaxCurve(.3f, .8f);
        m.startColor = new Color(.8f, .58f, .42f, .05f);
        e = streamers.emission; e.rateOverTime = 26f;
        s = streamers.shape; s.shapeType = ParticleSystemShapeType.Box; s.scale = new Vector3(60f, .3f, 60f); s.position = new Vector3(0f, .2f, 0f);
        v = streamers.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.World;
        v.x = new ParticleSystem.MinMaxCurve(3f, 5f); v.y = new ParticleSystem.MinMaxCurve(0f, 0f); v.z = new ParticleSystem.MinMaxCurve(.6f, 1.4f);
        var r = streamers.GetComponent<ParticleSystemRenderer>(); r.renderMode = ParticleSystemRenderMode.Stretch; r.velocityScale = .5f; r.lengthScale = 2.5f;
        FadeInOut(streamers);

        return new[] { haze.transform, motes.transform, streamers.transform };
    }

    private static void FadeInOut(ParticleSystem ps)
    {
        var col = ps.colorOverLifetime; col.enabled = true;
        var g = new Gradient();
        g.SetKeys(new[] { new GradientColorKey(Color.white, 0f), new GradientColorKey(Color.white, 1f) },
            new[] { new GradientAlphaKey(0f, 0f), new GradientAlphaKey(1f, .2f), new GradientAlphaKey(1f, .75f), new GradientAlphaKey(0f, 1f) });
        col.color = g;
    }

    private static ParticleSystem CreateFootstepDust(Transform parent, Material material)
    {
        var ps = Particles("Footstep Dust", parent, material, 400);
        var m = ps.main; m.loop = false; m.playOnAwake = false;
        m.startLifetime = new ParticleSystem.MinMaxCurve(1.6f, 3.4f);
        m.startSpeed = new ParticleSystem.MinMaxCurve(.25f, 1f);
        m.startSize = new ParticleSystem.MinMaxCurve(.1f, .26f);
        m.startColor = new Color(.78f, .58f, .42f, .3f);
        m.gravityModifier = .02f; // fine Mars dust lingers in thin air
        var e = ps.emission; e.enabled = false;
        var s = ps.shape; s.shapeType = ParticleSystemShapeType.Hemisphere; s.radius = .12f;
        var size = ps.sizeOverLifetime; size.enabled = true; size.size = new ParticleSystem.MinMaxCurve(1f, AnimationCurve.Linear(0f, .6f, 1f, 3.2f));
        var v = ps.velocityOverLifetime; v.enabled = true; v.space = ParticleSystemSimulationSpace.World;
        v.x = new ParticleSystem.MinMaxCurve(.3f, .7f); v.y = new ParticleSystem.MinMaxCurve(0f, 0f); v.z = new ParticleSystem.MinMaxCurve(.05f, .2f);
        var limit = ps.limitVelocityOverLifetime; limit.enabled = true; limit.dampen = .12f; limit.limit = .3f;
        FadeInOut(ps);
        return ps;
    }

    private static ReflectionProbe CreateReflectionProbe(Transform parent, MarsWorldGenerator world)
    {
        var probe = new GameObject("Mars Reflection Probe").AddComponent<ReflectionProbe>();
        probe.transform.SetParent(parent);
        probe.transform.position = Ground(world, AstronautSpawn) + Vector3.up * 1.6f;
        probe.mode = ReflectionProbeMode.Realtime;
        probe.refreshMode = ReflectionProbeRefreshMode.ViaScripting;
        probe.timeSlicingMode = ReflectionProbeTimeSlicingMode.NoTimeSlicing;
        probe.size = new Vector3(2400f, 800f, 2400f);
        probe.resolution = 256;
        probe.hdr = true;
        probe.farClipPlane = 3000f;
        probe.cullingMask = ~(1 << 2);
        return probe;
    }

    private static Camera CreateCamera(Transform parent, VolumeProfile post, VolumeProfile dofProfile, out Volume dofVolume)
    {
        var go = new GameObject("Main Camera") { tag = "MainCamera" };
        go.transform.SetParent(parent);
        var camera = go.AddComponent<Camera>();
        camera.fieldOfView = 55f; camera.nearClipPlane = .05f; camera.farClipPlane = 4000f;
        camera.allowHDR = true; camera.allowMSAA = true;
        go.AddComponent<AudioListener>();
        var data = go.AddComponent<UniversalAdditionalCameraData>();
        data.renderPostProcessing = true;
        data.antialiasing = AntialiasingMode.SubpixelMorphologicalAntiAliasing;
        data.antialiasingQuality = AntialiasingQuality.High;
        data.renderShadows = true;
        data.requiresDepthOption = CameraOverrideOption.On;

        var volume = new GameObject("Mars Cinematic Grade").AddComponent<Volume>();
        volume.transform.SetParent(parent);
        volume.isGlobal = true; volume.priority = 10f; volume.sharedProfile = post;

        dofVolume = new GameObject("Close-up Depth of Field").AddComponent<Volume>();
        dofVolume.transform.SetParent(parent);
        dofVolume.isGlobal = true; dofVolume.priority = 20f; dofVolume.weight = 0f; dofVolume.sharedProfile = dofProfile;
        return camera;
    }
}
