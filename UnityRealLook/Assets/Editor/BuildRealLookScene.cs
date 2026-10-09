using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using System.IO;

public static class BuildRealLookScene
{
    private const string ScenePath = "Assets/Scenes/RealLook.unity";

    [MenuItem("Echoes/Build Real Look Scene")]
    public static void Build()
    {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
        var root = new GameObject("MarsRealLook");

        root.AddComponent<global::RealLookBootstrap>();
        CreateLighting(root.transform);
        CreateAtmosphere(root.transform);
        CreateTerrain(root.transform);
        var astronaut = CreateAstronaut(root.transform);
        CreateRover(root.transform);
        CreateRocks(root.transform);
        CreateDust(root.transform);
        CreateCamera(root.transform, astronaut.transform);

        Directory.CreateDirectory(Path.Combine(Application.dataPath, "Art"));
        var source = Path.GetFullPath(Path.Combine(Application.dataPath, "..", "..", "public", "models", "game", "explorer-ultra.glb"));
        var destination = Path.Combine(Application.dataPath, "Art", "explorer-ultra.glb");
        if (File.Exists(source) && !File.Exists(destination)) File.Copy(source, destination);

        EditorSceneManager.SaveScene(scene, ScenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        AssetDatabase.SaveAssets();
        AssetDatabase.Refresh();
        Debug.Log("Real Look scene built at " + ScenePath);
    }

    private static Material Mat(string name, Color color, float metallic = 0f, float smoothness = .35f, Color? emission = null)
    {
        var material = new Material(Shader.Find("Universal Render Pipeline/Lit") ?? Shader.Find("Standard")) { name = name };
        material.color = color;
        if (material.HasProperty("_Metallic")) material.SetFloat("_Metallic", metallic);
        if (material.HasProperty("_Smoothness")) material.SetFloat("_Smoothness", smoothness);
        if (emission.HasValue && material.HasProperty("_EmissionColor"))
        {
            material.EnableKeyword("_EMISSION");
            material.SetColor("_EmissionColor", emission.Value);
        }
        return material;
    }

    private static GameObject Part(Transform parent, string name, PrimitiveType type, Vector3 pos, Vector3 scale, Material material)
    {
        var go = GameObject.CreatePrimitive(type);
        go.name = name;
        go.transform.SetParent(parent);
        go.transform.localPosition = pos;
        go.transform.localScale = scale;
        go.GetComponent<Renderer>().sharedMaterial = material;
        return go;
    }

    private static void CreateLighting(Transform parent)
    {
        RenderSettings.fog = true;
        RenderSettings.fogColor = new Color(.13f, .055f, .035f);
        RenderSettings.fogDensity = .012f;
        RenderSettings.ambientLight = new Color(.09f, .035f, .025f);

        var sun = new GameObject("Mars Sun").AddComponent<Light>();
        sun.type = LightType.Directional;
        sun.intensity = 1.7f;
        sun.color = new Color(1f, .55f, .36f);
        sun.transform.rotation = Quaternion.Euler(28f, -35f, 12f);
        sun.transform.SetParent(parent);

        var fill = new GameObject("Cold Fill").AddComponent<Light>();
        fill.type = LightType.Directional;
        fill.intensity = .35f;
        fill.color = new Color(.23f, .36f, .65f);
        fill.transform.rotation = Quaternion.Euler(315f, 145f, 0f);
        fill.transform.SetParent(parent);
    }

    private static void CreateAtmosphere(Transform parent)
    {
        var shader = Shader.Find("Skybox/Procedural");
        if (shader == null) return;
        var sky = new Material(shader) { name = "Mars Procedural Sky" };
        sky.SetFloat("_SunSize", .035f);
        sky.SetFloat("_SunSizeConvergence", 6f);
        sky.SetFloat("_AtmosphereThickness", 1.15f);
        sky.SetColor("_SkyTint", new Color(.62f, .22f, .12f));
        sky.SetColor("_GroundColor", new Color(.18f, .035f, .02f));
        sky.SetFloat("_Exposure", .75f);
        RenderSettings.skybox = sky;
        RenderSettings.sun = parent.GetComponentInChildren<Light>();
    }

    private static void CreateTerrain(Transform parent)
    {
        var terrain = new GameObject("Mars Ground");
        terrain.transform.SetParent(parent);
        var mesh = new Mesh { name = "Mars Regolith Mesh" };
        const int resolution = 48;
        const float size = 34f;
        var vertices = new Vector3[resolution * resolution];
        var uv = new Vector2[vertices.Length];
        for (var z = 0; z < resolution; z++)
            for (var x = 0; x < resolution; x++)
            {
                var u = x / (float)(resolution - 1);
                var v = z / (float)(resolution - 1);
                var px = (u - .5f) * size;
                var pz = (v - .5f) * size;
                var ridge = Mathf.PerlinNoise(u * 5.8f, v * 5.8f) * .55f;
                var fine = Mathf.PerlinNoise(u * 22f + 7f, v * 22f + 3f) * .11f;
                var crater = Mathf.Clamp01(1f - Vector2.Distance(new Vector2(px, pz), new Vector2(-4f, 2f)) / 4.5f);
                var height = ridge + fine - crater * crater * .55f;
                vertices[z * resolution + x] = new Vector3(px, height, pz);
                uv[z * resolution + x] = new Vector2(u * 5f, v * 5f);
            }
        var triangles = new int[(resolution - 1) * (resolution - 1) * 6];
        var ti = 0;
        for (var z = 0; z < resolution - 1; z++)
            for (var x = 0; x < resolution - 1; x++)
            {
                var i = z * resolution + x;
                triangles[ti++] = i; triangles[ti++] = i + resolution; triangles[ti++] = i + 1;
                triangles[ti++] = i + 1; triangles[ti++] = i + resolution; triangles[ti++] = i + resolution + 1;
            }
        mesh.vertices = vertices; mesh.triangles = triangles; mesh.uv = uv; mesh.RecalculateNormals();
        terrain.AddComponent<MeshFilter>().sharedMesh = mesh;
        terrain.AddComponent<MeshRenderer>().sharedMaterial = Mat("Regolith", new Color(.25f, .06f, .028f), 0f, .92f);
        terrain.AddComponent<MeshCollider>().sharedMesh = mesh;
        for (var i = 0; i < 26; i++)
        {
            var x = Mathf.Sin(i * 2.17f) * 13f;
            var z = Mathf.Cos(i * 1.31f) * 11f;
            var rock = Part(parent, "Distant Boulder", PrimitiveType.Sphere, new Vector3(x, .18f, z), Vector3.one * (0.25f + (i % 4) * .18f), Mat("Basalt", new Color(.12f, .045f, .027f), .05f, .8f));
            rock.transform.rotation = Quaternion.Euler(i * 17f, i * 31f, i * 7f);
        }
    }

    private static void CreateDust(Transform parent)
    {
        var dust = new GameObject("Mars Dust Volume");
        dust.transform.SetParent(parent);
        var ps = dust.AddComponent<ParticleSystem>();
        var main = ps.main;
        main.loop = true; main.playOnAwake = true; main.maxParticles = 900;
        main.startLifetime = new ParticleSystem.MinMaxCurve(8f, 16f);
        main.startSpeed = new ParticleSystem.MinMaxCurve(.02f, .16f);
        main.startSize = new ParticleSystem.MinMaxCurve(.015f, .07f);
        main.startColor = new Color(.95f, .46f, .25f, .22f);
        main.simulationSpace = ParticleSystemSimulationSpace.World;
        var emission = ps.emission; emission.rateOverTime = 55f;
        var shape = ps.shape; shape.shapeType = ParticleSystemShapeType.Box; shape.scale = new Vector3(34f, 4f, 34f);
        var velocity = ps.velocityOverLifetime; velocity.enabled = true; velocity.x = new ParticleSystem.MinMaxCurve(.02f, .12f); velocity.z = new ParticleSystem.MinMaxCurve(.01f, .08f);
        var renderer = ps.GetComponent<ParticleSystemRenderer>();
        renderer.renderMode = ParticleSystemRenderMode.Billboard;
        var particleShader = Shader.Find("Universal Render Pipeline/Particles/Unlit") ?? Shader.Find("Particles/Standard Unlit");
        if (particleShader != null) renderer.sharedMaterial = new Material(particleShader) { color = new Color(.95f, .42f, .2f, .18f) };
        ps.Play();
    }

    private static GameObject CreateAstronaut(Transform parent)
    {
        var astronaut = new GameObject("Astronaut");
        astronaut.transform.SetParent(parent);
        astronaut.transform.position = new Vector3(0f, 0f, 2.4f);
        var controller = astronaut.AddComponent<CharacterController>();
        controller.center = new Vector3(0f, 1.52f, 0f);
        controller.height = 3.05f;
        controller.radius = .42f;
        controller.stepOffset = .28f;
        var white = Mat("Suit White", new Color(.72f, .76f, .78f), .15f, .72f);
        var dark = Mat("Suit Carbon", new Color(.025f, .035f, .045f), .65f, .6f);
        var gold = Mat("Visor Gold", new Color(.65f, .28f, .035f), .75f, .88f, new Color(.2f, .055f, .008f));
        var cyan = Mat("Life Support Glow", new Color(.02f, .38f, .55f), .2f, .5f, new Color(0f, .5f, 1f));

        Part(astronaut.transform, "Torso", PrimitiveType.Capsule, new Vector3(0, 1.75f, 0), new Vector3(.72f, 1.05f, .48f), white);
        Part(astronaut.transform, "Chest Plate", PrimitiveType.Cube, new Vector3(0, 1.86f, -.49f), new Vector3(.52f, .42f, .08f), dark);
        Part(astronaut.transform, "Life Support Panel", PrimitiveType.Cube, new Vector3(0, 1.88f, -.575f), new Vector3(.22f, .14f, .035f), cyan);
        Part(astronaut.transform, "Helmet", PrimitiveType.Sphere, new Vector3(0, 3.02f, 0), Vector3.one * .62f, white);
        Part(astronaut.transform, "Gold Visor", PrimitiveType.Sphere, new Vector3(0, 3.04f, -.47f), new Vector3(.43f, .29f, .09f), gold);
        Part(astronaut.transform, "Backpack", PrimitiveType.Cube, new Vector3(0, 1.85f, .52f), new Vector3(.56f, .9f, .24f), dark);
        CreateLimb(astronaut.transform, "Left Arm", new Vector3(-.82f, 1.9f, 0), new Vector3(-.98f, 1.05f, -.02f), white);
        CreateLimb(astronaut.transform, "Right Arm", new Vector3(.82f, 1.9f, 0), new Vector3(.98f, 1.05f, -.02f), white);
        CreateLimb(astronaut.transform, "Left Leg", new Vector3(-.36f, .85f, 0), new Vector3(-.42f, .15f, 0), white);
        CreateLimb(astronaut.transform, "Right Leg", new Vector3(.36f, .85f, 0), new Vector3(.42f, .15f, 0), white);
        return astronaut;
    }

    private static void CreateLimb(Transform parent, string name, Vector3 top, Vector3 bottom, Material material)
    {
        var middle = Vector3.Lerp(top, bottom, .5f);
        var limb = Part(parent, name, PrimitiveType.Capsule, middle, new Vector3(.25f, .58f, .25f), material);
        limb.transform.rotation = Quaternion.FromToRotation(Vector3.up, bottom - top);
        Part(parent, name + " Joint", PrimitiveType.Sphere, top, Vector3.one * .29f, material);
        Part(parent, name + " Boot", PrimitiveType.Cube, bottom, new Vector3(.34f, .18f, .46f), Mat("Boot Carbon", new Color(.02f, .025f, .03f), .7f, .5f));
    }

    private static void CreateRover(Transform parent)
    {
        var rover = new GameObject("Scout Rover");
        rover.transform.SetParent(parent);
        rover.transform.position = new Vector3(-3.8f, .65f, 1.6f);
        var body = Mat("Rover Alloy", new Color(.12f, .16f, .18f), .8f, .72f);
        var panel = Mat("Solar Panel", new Color(.025f, .09f, .16f), .7f, .55f);
        Part(rover.transform, "Chassis", PrimitiveType.Cube, Vector3.zero, new Vector3(2.5f, .35f, 1.45f), body);
        Part(rover.transform, "Solar Array", PrimitiveType.Cube, new Vector3(0, .58f, .1f), new Vector3(2.1f, .06f, 1.1f), panel);
        Part(rover.transform, "Mast", PrimitiveType.Cylinder, new Vector3(0, 1.25f, 0), new Vector3(.08f, .7f, .08f), body);
        Part(rover.transform, "Camera Head", PrimitiveType.Cube, new Vector3(0, 2f, 0), new Vector3(.45f, .3f, .4f), body);
        for (var i = -1; i <= 1; i += 2)
            for (var z = -1; z <= 1; z += 2)
            {
                var wheel = Part(rover.transform, "Wheel", PrimitiveType.Cylinder, new Vector3(i * 1.05f, -.25f, z * .78f), new Vector3(.38f, .18f, .38f), Mat("Rubber", new Color(.015f, .012f, .01f), .1f, .4f));
                wheel.transform.rotation = Quaternion.Euler(90f, 0f, 0f);
            }
    }

    private static void CreateRocks(Transform parent)
    {
        var rockMaterial = Mat("Foreground Rock", new Color(.19f, .05f, .028f), .1f, .84f);
        for (var i = 0; i < 9; i++)
        {
            var rock = Part(parent, "Foreground Rock", PrimitiveType.Sphere, new Vector3(-7f + i * 1.5f, .25f, 5.5f + Mathf.Sin(i) * .8f), new Vector3(.5f, .35f, .7f), rockMaterial);
            rock.transform.rotation = Quaternion.Euler(i * 13f, i * 27f, i * 5f);
        }
    }

    private static void CreateCamera(Transform parent, Transform focus)
    {
        var camera = new GameObject("Main Camera");
        camera.tag = "MainCamera";
        camera.transform.SetParent(parent);
        camera.transform.position = new Vector3(6.8f, 4.1f, 8.8f);
        camera.transform.LookAt(focus.position + Vector3.up * 1.5f);
        var component = camera.AddComponent<Camera>();
        component.fieldOfView = 48f;
        component.allowHDR = true;
        var volume = new GameObject("Cinematic Volume").AddComponent<Volume>();
        volume.isGlobal = true;
        volume.priority = 10;
        var profile = ScriptableObject.CreateInstance<VolumeProfile>();
        var color = profile.Add<ColorAdjustments>();
        color.postExposure.overrideState = true;
        color.postExposure.value = -.45f;
        color.contrast.overrideState = true;
        color.contrast.value = 18f;
        color.colorFilter.overrideState = true;
        color.colorFilter.value = new Color(.94f, .78f, .68f);
        var bloom = profile.Add<Bloom>();
        bloom.intensity.overrideState = true;
        bloom.intensity.value = .35f;
        bloom.threshold.overrideState = true;
        bloom.threshold.value = 1.05f;
        volume.profile = profile;
    }
}
