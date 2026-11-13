using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.SceneManagement;

/// <summary>Installs the rover archive without replacing or rebuilding the current scene.</summary>
public static class RoverShowcaseSetup
{
    private const string PrefabFolder = "Assets/Art/Prefabs/Rovers";
    private const string ModelFolder = "Assets/Art/Models/";
    private const string MaterialsFolder = "Assets/Art/Materials/RoverArchive";
    private const string RoverCredit = "NASA/JPL-Caltech";

    [MenuItem("Echoes/Prepare Five-Rover Showcase (preserve scene)")]
    public static void PrepareMenu() => PrepareCurrentScene();

    [MenuItem("Echoes/Repair Existing Scene (preserve scene)")]
    public static void RepairExistingScene()
    {
        var scene = SceneManager.GetActiveScene();
        if (!scene.IsValid() || scene.name != "RealLook") scene = EditorSceneManager.OpenScene(BuildRealLookScene.ScenePath, OpenSceneMode.Single);
        var fixedParticles = 0;
        foreach (var particle in Object.FindObjectsByType<ParticleSystem>(FindObjectsSortMode.None))
        {
            var velocity = particle.velocityOverLifetime;
            if (!velocity.enabled) continue;
            velocity.y = new ParticleSystem.MinMaxCurve(0f, 0f);
            fixedParticles++;
        }
        var fixedColliders = 0;
        foreach (var collider in Object.FindObjectsByType<MeshCollider>(FindObjectsSortMode.None))
        {
            if (!collider.convex || collider.attachedRigidbody != null) continue;
            collider.convex = false;
            fixedColliders++;
        }
        EditorSceneManager.MarkSceneDirty(scene);
        EditorSceneManager.SaveScene(scene);
        Debug.Log($"[RoverShowcase] Repaired {fixedParticles} particle velocity curves and {fixedColliders} static rock colliders in the existing scene.");
    }

    public static void PrepareCurrentScene()
    {
        var scene = SceneManager.GetActiveScene();
        if (!scene.IsValid() || scene.name != "RealLook")
        {
            scene = EditorSceneManager.OpenScene(BuildRealLookScene.ScenePath, OpenSceneMode.Single);
        }
        var sceneRoot = GameObject.Find("MarsRealLook");
        if (sceneRoot == null) throw new System.InvalidOperationException("The loaded scene does not contain MarsRealLook.");
        EnsureFolder("Assets/Art/Prefabs");
        EnsureFolder(PrefabFolder);
        EnsureFolder(MaterialsFolder);

        var showcaseRoot = sceneRoot.transform.Find("Rover Showcase")?.gameObject;
        if (showcaseRoot == null) showcaseRoot = new GameObject("Rover Showcase");
        showcaseRoot.transform.SetParent(sceneRoot.transform, false);
        var world = sceneRoot.GetComponentInChildren<MarsWorldGenerator>();
        var existingOpportunity = sceneRoot.GetComponentsInChildren<Transform>(true)
            .FirstOrDefault(t => t.name.StartsWith("Opportunity (MER-B)"))?.gameObject;
        if (existingOpportunity == null)
            existingOpportunity = MakeImported("Opportunity", "NASA_MER_Rover_JPL.glb", 1.5f, showcaseRoot.transform, world, new Vector3(-1.6f, 0f, -4.3f));
        else existingOpportunity.transform.SetParent(showcaseRoot.transform, true);
        existingOpportunity.name = "Opportunity (MER-B) · NASA/JPL-Caltech";
        EnsureRootCollider(existingOpportunity, new Vector3(0f, .78f, -.08f), new Vector3(2.25f, 1.5f, 1.66f));

        var roots = new GameObject[5];
        roots[0] = EnsureProceduralSojourner(showcaseRoot.transform, world);
        roots[1] = EnsureImportedChild(showcaseRoot.transform, "Spirit (MER-A) · NASA/JPL-Caltech", "NASA_MER_Rover_JPL.glb", 1.5f, world);
        roots[2] = existingOpportunity;
        roots[3] = EnsureImportedChild(showcaseRoot.transform, "Curiosity (MSL) · NASA/JPL-Caltech", "NASA_Curiosity_MSL.glb", 2.15f, world);
        roots[4] = EnsureImportedChild(showcaseRoot.transform, "Perseverance (Mars 2020) · NASA/JPL-Caltech", "NASA_Perseverance.glb", 2.15f, world);

        var info = new[]
        {
            new RoverShowcaseController.RoverEntry { name = "Sojourner", missionYear = "1997 · Pathfinder", landingSite = "Ares Vallis", description = "The first wheeled rover to explore another planet. Its compact six-wheel chassis carried a camera and an alpha proton X-ray spectrometer.", provenance = "Research-informed reconstruction · NASA/JPL rover dimensions and layout", model = roots[0], parts = Parts("Wheels & suspension|Six small wheels let the lightweight rover cross rocks; rocker-bogie geometry was simplified for this reconstruction.", "Imager mast|The camera assembly returned views used to plan short Pathfinder traverses.", "Solar array|Photovoltaic cells on the body supplied electrical power.", "APXS|The alpha proton X-ray spectrometer measured the elemental composition of nearby rocks and soil.") },
            new RoverShowcaseController.RoverEntry { name = "Spirit · MER-A", missionYear = "2004 · Mars Exploration Rover", landingSite = "Gusev Crater", description = "Spirit examined rocks and soils for evidence of past water. The solar-powered rover used a rocker-bogie chassis and a panoramic camera mast.", provenance = "NASA/JPL-Caltech · MER twin rover model", model = roots[1], parts = Parts("Wheels & rocker-bogie|Six wheels and articulated suspension distributed loads across uneven terrain.", "Pancam mast|The panoramic camera pair produced color, stereo views for science and navigation.", "High-gain antenna|A steerable dish supported direct communication with Earth.", "Instrument arm|The robotic arm positioned science tools against selected rocks.") },
            new RoverShowcaseController.RoverEntry { name = "Opportunity · MER-B", missionYear = "2004 · Mars Exploration Rover", landingSite = "Meridiani Planum · Endeavour Crater", description = "Opportunity found evidence that liquid water once altered Martian rocks. It operated for nearly 15 years and traveled 45.16 km.", provenance = "NASA/JPL-Caltech · official MER reference model", model = roots[2], parts = Parts("Wheels & rocker-bogie|Six wheels and articulated suspension enabled slow, stable travel over rough ground.", "Pancam mast|The stereo panoramic cameras documented geology and helped choose targets.", "High-gain antenna|The dish relayed mission data directly to Earth when geometry allowed.", "Instrument arm|The arm carried the microscopic imager and contact science instruments.") },
            new RoverShowcaseController.RoverEntry { name = "Curiosity · MSL", missionYear = "2012 · Mars Science Laboratory", landingSite = "Gale Crater · Mount Sharp", description = "A car-sized mobile laboratory studying the habitability and geology of Gale Crater with a laser, drill, cameras and onboard analytical instruments.", provenance = "NASA/JPL-Caltech · official Curiosity model", model = roots[3], parts = Parts("Wheels & rocker-bogie|Six cleated aluminum wheels and rocker-bogie suspension carry the one-ton rover.", "Remote sensing mast|Mast cameras and ChemCam observe terrain and analyze distant targets.", "Robotic arm & turret|The arm positions a drill, brush, and contact instruments at rock targets.", "RTG power system|A radioisotope thermoelectric generator supplies power and heat.") },
            new RoverShowcaseController.RoverEntry { name = "Perseverance · Mars 2020", missionYear = "2021 · Mars 2020", landingSite = "Jezero Crater", description = "Perseverance studies ancient environments and collects sealed samples for possible future return. Its upgraded chassis carries a sample caching system.", provenance = "NASA/JPL-Caltech · official Perseverance model", model = roots[4], parts = Parts("Wheels & rocker-bogie|Six redesigned wheels and rocker-bogie suspension handle the Jezero terrain.", "Mast cameras|Mastcam-Z provides zoomable stereo images; SuperCam studies distant targets.", "Sampling arm & coring drill|The arm drills, handles sample tubes and places them in the caching system.", "MMRTG power system|A multi-mission radioisotope thermoelectric generator supplies electrical power and heat.") },
        };

        for (var i = 0; i < roots.Length; i++)
        {
            if (roots[i] == null) throw new System.InvalidOperationException("Rover setup did not produce model index " + i);
            roots[i].SetActive(i == 2);
            SaveRoverPrefab(roots[i], new[] { "Sojourner", "Spirit", "Opportunity", "Curiosity", "Perseverance" }[i]);
        }

        var camera = Camera.main;
        var explorer = sceneRoot.GetComponent<RealLookBootstrap>();
        var director = sceneRoot.GetComponent<CinematicShotDirector>();
        var controller = sceneRoot.GetComponent<RoverShowcaseController>() ?? sceneRoot.AddComponent<RoverShowcaseController>();
        controller.Configure(info, camera, explorer != null ? explorer.Explorer : null, director);
        if (explorer != null) explorer.SetRover(roots[2].transform);
        if (director != null) director.SetRover(roots[2].transform);

        EditorSceneManager.MarkSceneDirty(scene);
        EditorSceneManager.SaveScene(scene);
        AssetDatabase.SaveAssets();
        Debug.Log("[RoverShowcase] Added five rover prefabs, mission records, component inspection and selection to RealLook.");
    }

    private static RoverShowcaseController.InspectionPart[] Parts(params string[] definitions)
    {
        var anchors = new[] { new Vector3(-.62f, .24f, -.34f), new Vector3(0f, 1.1f, .18f), new Vector3(0f, .7f, .53f), new Vector3(.25f, .62f, -.32f) };
        return definitions.Select((line, i) =>
        {
            var fields = line.Split('|');
            return new RoverShowcaseController.InspectionPart { name = fields[0], description = fields[1], anchor = anchors[i % anchors.Length] };
        }).ToArray();
    }

    private static GameObject EnsureImportedChild(Transform parent, string name, string file, float height, MarsWorldGenerator world)
    {
        var existing = parent.Cast<Transform>().FirstOrDefault(t => t.name.StartsWith(name))?.gameObject;
        if (existing != null) return existing;
        return MakeImported(name, file, height, parent, world, new Vector3(-1.6f, 0f, -4.3f));
    }

    private static GameObject MakeImported(string name, string file, float targetHeight, Transform parent, MarsWorldGenerator world, Vector3 location)
    {
        var assetPath = ModelFolder + file;
        var asset = AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
        if (asset == null) throw new System.InvalidOperationException($"Missing or unimported rover model: {assetPath}. Let Unity finish importing the model, then run Prepare Five-Rover Showcase again.");
        var root = new GameObject(name);
        root.transform.SetParent(parent, false);
        root.transform.position = new Vector3(location.x, world != null ? world.SampleHeight(location.x, location.z) : 0f, location.z);
        var model = (GameObject)PrefabUtility.InstantiatePrefab(asset, root.transform);
        model.name = "NASA reference model";
        var renderers = model.GetComponentsInChildren<Renderer>(true);
        if (renderers.Length == 0) throw new System.InvalidOperationException("The imported model has no visible renderers: " + assetPath);
        var bounds = BoundsOf(renderers);
        var scale = targetHeight / Mathf.Max(.001f, bounds.size.y);
        model.transform.localScale = Vector3.one * scale;
        bounds = BoundsOf(renderers);
        model.transform.position += new Vector3(-bounds.center.x, -bounds.min.y, -bounds.center.z);
        foreach (var renderer in renderers) renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
        EnsureRootCollider(root, new Vector3(0f, targetHeight * .42f, 0f), new Vector3(targetHeight * 1.35f, targetHeight * .88f, targetHeight * 1.25f));
        return root;
    }

    private static Bounds BoundsOf(Renderer[] renderers)
    {
        var bounds = renderers[0].bounds;
        for (var i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
        return bounds;
    }

    private static GameObject EnsureProceduralSojourner(Transform parent, MarsWorldGenerator world)
    {
        var existing = parent.Find("Sojourner · research-informed reconstruction")?.gameObject;
        if (existing != null) return existing;
        var root = new GameObject("Sojourner · research-informed reconstruction");
        root.transform.SetParent(parent, false);
        root.transform.position = new Vector3(-1.6f, world != null ? world.SampleHeight(-1.6f, -4.3f) : 0f, -4.3f);
        var shell = Surface("Sojourner warm aluminum", new Color(.62f, .52f, .38f), .52f, .58f);
        var frame = Surface("Sojourner structural metal", new Color(.38f, .34f, .28f), .76f, .38f);
        var rubber = Surface("Sojourner wheel rubber", new Color(.075f, .068f, .055f), .03f, .84f);
        var panel = Surface("Sojourner solar cells", new Color(.06f, .13f, .2f), .58f, .28f);
        var glass = Surface("Sojourner camera glass", new Color(.018f, .055f, .07f), .5f, .18f);
        Part(root.transform, "Chassis · electronics box", new Vector3(0f, .34f, 0f), new Vector3(.45f, .15f, .52f), shell);
        Part(root.transform, "Front bumper", new Vector3(0f, .32f, .3f), new Vector3(.48f, .035f, .035f), frame);
        // Six independently named wheels and the visibly articulated rocker links.
        for (var side = -1; side <= 1; side += 2)
        for (var axle = -1; axle <= 1; axle++)
        {
            var z = axle * .22f;
            var wheel = new GameObject((side < 0 ? "Left" : "Right") + " wheel " + (axle + 2));
            wheel.transform.SetParent(root.transform, false);
            wheel.transform.localPosition = new Vector3(side * .3f, .145f, z);
            wheel.transform.localRotation = Quaternion.Euler(0f, 0f, 90f);
            wheel.transform.localScale = new Vector3(.085f, .14f, .14f);
            var mesh = wheel.AddComponent<MeshFilter>(); mesh.sharedMesh = Resources.GetBuiltinResource<Mesh>("Cylinder.fbx");
            wheel.AddComponent<MeshRenderer>().sharedMaterial = rubber;
            Part(root.transform, (side < 0 ? "Left" : "Right") + " rocker suspension " + axle, new Vector3(side * .25f, .25f, z * .8f), new Vector3(.025f, .22f, .06f), frame);
        }
        Part(root.transform, "Solar panel", new Vector3(0f, .435f, -.01f), new Vector3(.39f, .018f, .45f), panel);
        for (var x = -1; x <= 1; x++)
        for (var z = -1; z <= 1; z++)
            Part(root.transform, $"Solar cell {x + 2}-{z + 2}", new Vector3(x * .115f, .447f, z * .14f), new Vector3(.105f, .008f, .128f), panel);
        Part(root.transform, "Camera mast", new Vector3(0f, .65f, -.2f), new Vector3(.025f, .42f, .025f), frame);
        Part(root.transform, "Stereo imager housing", new Vector3(0f, .87f, -.2f), new Vector3(.19f, .075f, .065f), shell);
        Part(root.transform, "Left imager lens", new Vector3(-.052f, .87f, -.163f), new Vector3(.034f, .034f, .012f), glass);
        Part(root.transform, "Right imager lens", new Vector3(.052f, .87f, -.163f), new Vector3(.034f, .034f, .012f), glass);
        Part(root.transform, "APXS contact instrument", new Vector3(.23f, .31f, .16f), new Vector3(.14f, .09f, .12f), shell);
        Part(root.transform, "UHF antenna mast", new Vector3(.16f, .57f, -.12f), new Vector3(.014f, .36f, .014f), frame);
        var top = Part(root.transform, "UHF antenna", new Vector3(.16f, .77f, -.12f), new Vector3(.05f, .025f, .05f), shell);
        top.transform.localScale = new Vector3(.12f, .025f, .12f);
        var collider = root.AddComponent<BoxCollider>(); collider.center = new Vector3(0f, .42f, 0f); collider.size = new Vector3(.82f, .95f, .9f);
        return root;
    }

    private static GameObject Part(Transform parent, string name, Vector3 position, Vector3 scale, Material material)
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Cube);
        go.name = name;
        go.transform.SetParent(parent, false);
        go.transform.localPosition = position;
        go.transform.localScale = scale;
        go.GetComponent<Renderer>().sharedMaterial = material;
        Object.DestroyImmediate(go.GetComponent<Collider>());
        return go;
    }

    private static Material Surface(string name, Color color, float metallic, float smoothness)
    {
        var path = MaterialsFolder + "/" + name + ".mat";
        var material = AssetDatabase.LoadAssetAtPath<Material>(path);
        if (material != null) return material;
        var shader = Shader.Find("Universal Render Pipeline/Lit");
        if (shader == null) throw new System.InvalidOperationException("URP Lit shader is not available.");
        material = new Material(shader) { name = name };
        material.SetColor("_BaseColor", color);
        material.SetFloat("_Metallic", metallic);
        material.SetFloat("_Smoothness", smoothness);
        AssetDatabase.CreateAsset(material, path);
        return material;
    }

    private static void EnsureRootCollider(GameObject root, Vector3 center, Vector3 size)
    {
        var collider = root.GetComponent<BoxCollider>();
        if (collider == null) collider = root.AddComponent<BoxCollider>();
        if (collider == null) throw new System.InvalidOperationException("Unity could not add the rover selection collider to " + root.name);
        collider.center = center;
        collider.size = size;
    }

    private static void SaveRoverPrefab(GameObject instance, string name)
    {
        var path = PrefabFolder + "/" + name + ".prefab";
        PrefabUtility.SaveAsPrefabAsset(instance, path);
    }

    private static void EnsureFolder(string path)
    {
        if (AssetDatabase.IsValidFolder(path)) return;
        var parent = Path.GetDirectoryName(path).Replace('\\', '/');
        var name = Path.GetFileName(path);
        if (!AssetDatabase.IsValidFolder(parent)) EnsureFolder(parent);
        AssetDatabase.CreateFolder(parent, name);
    }
}

