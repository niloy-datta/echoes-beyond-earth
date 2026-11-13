using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.Rendering;

/// <summary>
/// Deterministically builds the Mars exploration area (heightfield terrain,
/// splat layers and the fractured rock field) whenever the scene is enabled —
/// in the Editor and in players. Nothing generated here is serialized, which
/// keeps multi-megabyte terrain and rock data out of the scene file and git.
/// This is an artistic reconstruction informed by rover imagery, not NASA
/// elevation data.
/// </summary>
[ExecuteAlways]
[DefaultExecutionOrder(-1000)]
public sealed class MarsWorldGenerator : MonoBehaviour
{
    public const float TerrainSize = 2400f;
    public const float MinHeight = -95f;
    public const float MaxHeight = 430f;
    private const int HeightResolution = 2049;
    private const int SplatResolution = 2048;

    [SerializeField] private Material terrainMaterial;
    [SerializeField] private TerrainLayer[] terrainLayers = new TerrainLayer[4];
    [SerializeField] private Material[] rockMaterials = new Material[3];
    [SerializeField] private Vector4[] exclusionZones = { new Vector4(0f, 0f, 4f, 0f) };
    [SerializeField] private int seed = 1977;
    [SerializeField, Range(.25f, 1.5f)] private float rockDensity = 1f;
    [SerializeField] private float pixelError = 1.5f;

    private GameObject generatedRoot;
    private Terrain terrain;

    public Terrain Terrain => terrain;
    public bool IsGenerated => terrain != null;

    private struct Crater
    {
        public Vector2 Centre;
        public float Radius, Depth, Rim, Peak;
    }

    private Crater[] craters;

    public void Configure(Material terrainMat, TerrainLayer[] layers, Material[] rocks, Vector4[] exclusions)
    {
        terrainMaterial = terrainMat;
        terrainLayers = layers;
        rockMaterials = rocks;
        exclusionZones = exclusions;
    }

    public void SetPixelError(float error)
    {
        pixelError = error;
        if (terrain != null) terrain.heightmapPixelError = error;
    }

    private void OnEnable() => Generate();

    private void OnDisable() => Clear();

    public void Regenerate()
    {
        Clear();
        Generate();
    }

    public float SampleHeight(float x, float z)
    {
        if (terrain == null) return EvaluateHeight(x, z, out _, out _, out _);
        return terrain.SampleHeight(new Vector3(x, 0f, z)) + terrain.transform.position.y;
    }

    public Vector3 SampleNormal(float x, float z)
    {
        if (terrain == null) return Vector3.up;
        var td = terrain.terrainData;
        var p = new Vector3(x, 0f, z) - terrain.transform.position;
        return td.GetInterpolatedNormal(p.x / td.size.x, p.z / td.size.z);
    }

    private void Clear()
    {
        if (generatedRoot == null) return;
        if (Application.isPlaying) Destroy(generatedRoot);
        else DestroyImmediate(generatedRoot);
        generatedRoot = null;
        terrain = null;
    }

    private void Generate()
    {
        if (generatedRoot != null) return;
        var watch = System.Diagnostics.Stopwatch.StartNew();
        BuildCraters();
        generatedRoot = new GameObject("Generated Mars World (runtime)") { hideFlags = HideFlags.DontSave };
        generatedRoot.transform.SetParent(transform, false);
        BuildTerrain();
        BuildRockField();
        Debug.Log($"[MarsWorld] Generated terrain and rock field in {watch.ElapsedMilliseconds} ms");
    }

    // ------------------------------------------------------------------ terrain

    private void BuildCraters()
    {
        var list = new List<Crater>
        {
            new Crater { Centre = new Vector2(380f, 430f), Radius = 235f, Depth = 72f, Rim = 26f, Peak = 30f },
            new Crater { Centre = new Vector2(-175f, 220f), Radius = 58f, Depth = 15f, Rim = 5.2f },
            new Crater { Centre = new Vector2(150f, -170f), Radius = 31f, Depth = 7.5f, Rim = 2.6f },
            new Crater { Centre = new Vector2(46f, 62f), Radius = 14f, Depth = 3.2f, Rim = 1.2f },
        };
        var rng = new System.Random(seed);
        while (list.Count < 52)
        {
            var angle = (float)rng.NextDouble() * Mathf.PI * 2f;
            var dist = 22f + (float)rng.NextDouble() * 430f;
            var radius = Mathf.Lerp(2.2f, 11f, Mathf.Pow((float)rng.NextDouble(), 2.2f));
            var centre = new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * dist;
            list.Add(new Crater { Centre = centre, Radius = radius, Depth = radius * .22f, Rim = radius * .07f });
        }
        craters = list.ToArray();
    }

    /// <summary>World-space height plus masks used to drive surface layers.</summary>
    private float EvaluateHeight(float x, float z, out float ejecta, out float dune, out float strata)
    {
        var r = Mathf.Sqrt(x * x + z * z);
        var ox = x + 4096f;
        var oz = z + 4096f;
        // Keep a gently rolling, walkable plain around the landing site.
        var playable = MarsNoise.SmoothStep(18f, 90f, r);

        var h = MarsNoise.Fbm(ox * .0017f, oz * .0017f, 4) * 20f;
        h += MarsNoise.Fbm(ox * .0061f + 31f, oz * .0061f + 17f, 4) * (1.6f + 2.9f * playable);

        // Wind-sculpted transverse dunes to the west.
        var duneMask = MarsNoise.SmoothStep(.08f, .4f, MarsNoise.Fbm(ox * .0024f + 50f, oz * .0024f + 80f, 2))
                       * MarsNoise.SmoothStep(-60f, -150f, x) * MarsNoise.SmoothStep(1100f, 650f, r);
        dune = 0f;
        if (duneMask > .001f)
        {
            var warp = MarsNoise.Fbm(ox * .011f, oz * .011f, 2) * 1.6f;
            var u = (x * .83f + z * .56f) / 24f + warp;
            var f = u - Mathf.Floor(u);
            var profile = f < .72f ? MarsNoise.SmoothStep(0f, .72f, f) : MarsNoise.SmoothStep(1f, .72f, f);
            h += profile * 3.4f * duneMask;
            dune = duneMask * (profile > .82f ? 1f : -1f + profile * 1.2f);
        }

        // Eroded ridges, increasingly rugged away from the landing site.
        var ridgeAmp = Mathf.Lerp(1.4f, 34f, MarsNoise.SmoothStep(120f, 760f, r));
        h += (MarsNoise.Ridged(ox * .0038f + 9f, oz * .0038f + 4f, 5) - .35f) * ridgeAmp * Mathf.Max(.25f, playable);

        // Fine, metre-scale ground displacement.
        h += MarsNoise.Fbm(ox * .09f, oz * .09f, 3) * .32f + MarsNoise.Noise(ox * .37f, oz * .37f, 7.7f) * .06f;

        // Stratified mesas (terraced sedimentary layers) north-east, behind the big crater.
        strata = 0f;
        var mesaZone = MarsNoise.SmoothStep(480f, 680f, r) * MarsNoise.SmoothStep(-.1f, .45f, (x + z) / Mathf.Max(r, 1f));
        if (mesaZone > .001f)
        {
            var n = MarsNoise.Fbm(ox * .0031f + 70f, oz * .0031f + 12f, 3) * .5f + .5f;
            var plateau = MarsNoise.SmoothStep(.46f, .6f, n) * 52f + MarsNoise.SmoothStep(.6f, .7f, n) * 30f + MarsNoise.SmoothStep(.7f, .78f, n) * 16f;
            var layered = Mathf.Floor(plateau / 11f) * 11f + MarsNoise.SmoothStep(0f, 1f, plateau / 11f - Mathf.Floor(plateau / 11f)) * 11f;
            h += layered * mesaZone;
            strata = mesaZone * MarsNoise.SmoothStep(4f, 20f, plateau);
        }

        // Distant mountain ring closes the horizon.
        var ring = MarsNoise.SmoothStep(760f, 1150f, r);
        if (ring > .001f)
        {
            // Old, wind-eroded massifs: domain-warped, rounded crests rather than alpine spikes.
            var wx = ox * .0016f + MarsNoise.Fbm(ox * .004f, oz * .004f, 2) * 1.4f;
            var wz = oz * .0016f + MarsNoise.Fbm(ox * .004f + 9f, oz * .004f + 3f, 2) * 1.4f;
            var broad = MarsNoise.SmoothStep(.28f, .9f, MarsNoise.Fbm(wx + 40f, wz + 90f, 5) * .5f + .5f);
            var crest = MarsNoise.Ridged(wx * 2.3f + 7f, wz * 2.3f + 1f, 3) * broad;
            h += (broad * 230f + crest * 28f) * ring;
        }

        // Impact craters: parabolic bowl, raised rim, ejecta blanket, central peak.
        ejecta = 0f;
        for (var i = 0; i < craters.Length; i++)
        {
            var c = craters[i];
            var dx = x - c.Centre.x;
            var dz = z - c.Centre.y;
            var reach = c.Radius * 2.6f;
            if (dx * dx + dz * dz > reach * reach) continue;
            var irregular = 1f + MarsNoise.Noise(dx / c.Radius * 1.7f + i, dz / c.Radius * 1.7f, 3.3f) * .09f;
            var d = Mathf.Sqrt(dx * dx + dz * dz) / (c.Radius * irregular);
            if (d < 1f) h -= c.Depth * (1f - d * d);
            h += c.Rim * Mathf.Exp(-(d - 1f) * (d - 1f) / .045f);
            if (d > 1f) h += c.Rim * .45f * Mathf.Exp(-(d - 1f) * 2.4f);
            if (c.Peak > 0f) h += c.Peak * Mathf.Exp(-d * d / .018f);
            ejecta = Mathf.Max(ejecta, MarsNoise.SmoothStep(.8f, 1f, d) * MarsNoise.SmoothStep(1.9f, 1.05f, d));
        }
        return h;
    }

    private void BuildTerrain()
    {
        var heights = new float[HeightResolution, HeightResolution];
        var ejecta = new float[HeightResolution, HeightResolution];
        var dunes = new float[HeightResolution, HeightResolution];
        var strata = new float[HeightResolution, HeightResolution];
        var step = TerrainSize / (HeightResolution - 1);
        var range = MaxHeight - MinHeight;
        Parallel.For(0, HeightResolution, zi =>
        {
            var z = -TerrainSize * .5f + zi * step;
            for (var xi = 0; xi < HeightResolution; xi++)
            {
                var x = -TerrainSize * .5f + xi * step;
                var h = EvaluateHeight(x, z, out var e, out var d, out var s);
                heights[zi, xi] = Mathf.Clamp01((h - MinHeight) / range);
                ejecta[zi, xi] = e; dunes[zi, xi] = d; strata[zi, xi] = s;
            }
        });

        var data = new TerrainData { hideFlags = HideFlags.DontSave, name = "Mars Terrain Data (runtime)" };
        data.heightmapResolution = HeightResolution;
        data.size = new Vector3(TerrainSize, range, TerrainSize);
        data.SetHeights(0, 0, heights);
        data.alphamapResolution = SplatResolution;
        data.baseMapResolution = 1024;
        if (terrainLayers != null && terrainLayers.Length == 4 && terrainLayers[0] != null)
        {
            data.terrainLayers = terrainLayers;
            data.SetAlphamaps(0, 0, BuildSplat(heights, ejecta, dunes, strata, step * (HeightResolution - 1) / SplatResolution, range));
        }

        var go = Terrain.CreateTerrainGameObject(data);
        go.name = "Mars Terrain";
        go.hideFlags = HideFlags.DontSave;
        go.isStatic = true;
        go.transform.SetParent(generatedRoot.transform, false);
        go.transform.position = new Vector3(-TerrainSize * .5f, MinHeight, -TerrainSize * .5f);
        terrain = go.GetComponent<Terrain>();
        terrain.materialTemplate = terrainMaterial;
        terrain.heightmapPixelError = pixelError;
        terrain.basemapDistance = 650f;
        terrain.drawInstanced = true;
        terrain.shadowCastingMode = ShadowCastingMode.TwoSided;
        terrain.reflectionProbeUsage = ReflectionProbeUsage.BlendProbes;
        terrain.allowAutoConnect = false;
        terrain.Flush();
    }

    private float[,,] BuildSplat(float[,] heights, float[,] ejecta, float[,] dunes, float[,] strata, float texel, float range)
    {
        var map = new float[SplatResolution, SplatResolution, 4];
        var hStep = TerrainSize / (HeightResolution - 1);
        Parallel.For(0, SplatResolution, zi =>
        {
            for (var xi = 0; xi < SplatResolution; xi++)
            {
                var hx = Mathf.Clamp(Mathf.RoundToInt(xi * (HeightResolution - 1f) / (SplatResolution - 1f)), 1, HeightResolution - 2);
                var hz = Mathf.Clamp(Mathf.RoundToInt(zi * (HeightResolution - 1f) / (SplatResolution - 1f)), 1, HeightResolution - 2);
                var gx = (heights[hz, hx + 1] - heights[hz, hx - 1]) * range / (2f * hStep);
                var gz = (heights[hz + 1, hx] - heights[hz - 1, hx]) * range / (2f * hStep);
                var slope = Mathf.Atan(Mathf.Sqrt(gx * gx + gz * gz)) * Mathf.Rad2Deg;
                var concavity = (heights[hz, hx + 1] + heights[hz, hx - 1] + heights[hz + 1, hx] + heights[hz - 1, hx] - 4f * heights[hz, hx]) * range;

                var wx = xi * texel + 4096f;
                var wz = zi * texel + 4096f;
                var patch = MarsNoise.Fbm(wx * .021f, wz * .021f, 3);
                var broad = MarsNoise.Fbm(wx * .0045f + 11f, wz * .0045f + 7f, 3);

                var rock = MarsNoise.SmoothStep(19f, 31f, slope) + strata[hz, hx] * MarsNoise.SmoothStep(8f, 18f, slope);
                var dune = dunes[hz, hx];
                var basalt = ejecta[hz, hx] * .75f + Mathf.Max(0f, -dune) * .9f + MarsNoise.SmoothStep(.18f, .45f, patch) * .55f;
                var dust = Mathf.Max(0f, dune) * 1.1f + MarsNoise.SmoothStep(.05f, .4f, broad) * .7f + Mathf.Clamp01(concavity * 3f) * .5f;
                var flat = 1f - Mathf.Clamp01(rock);
                var regolith = .85f + MarsNoise.SmoothStep(.3f, -.3f, patch) * .4f;

                var w0 = regolith * flat;
                var w1 = dust * flat * MarsNoise.SmoothStep(14f, 6f, slope);
                var w2 = Mathf.Clamp01(rock);
                var w3 = basalt * flat;
                var sum = w0 + w1 + w2 + w3 + 1e-5f;
                map[zi, xi, 0] = w0 / sum;
                map[zi, xi, 1] = w1 / sum;
                map[zi, xi, 2] = w2 / sum;
                map[zi, xi, 3] = w3 / sum;
            }
        });
        return map;
    }

    // --------------------------------------------------------------- rock field

    private enum RockClass { Pebble, Stone, Boulder, Giant, Slab }

    private struct RockInstance
    {
        public RockClass Class;
        public int Variant;
        public int Material;
        public Matrix4x4 Matrix;
        public float Size;
        public Vector3 Position;
    }

    private void BuildRockField()
    {
        if (rockMaterials == null || rockMaterials.Length < 3 || rockMaterials[0] == null) return;
        var rng = new System.Random(seed * 31 + 7);
        var rocks = new List<RockInstance>(16000);

        Scatter(rocks, rng, RockClass.Pebble, Mathf.RoundToInt(9000 * rockDensity), 1.5f, 72f, .022f, .11f, 3.2f);
        Scatter(rocks, rng, RockClass.Stone, Mathf.RoundToInt(3400 * rockDensity), 2f, 190f, .11f, .42f, 2.4f);
        Scatter(rocks, rng, RockClass.Boulder, Mathf.RoundToInt(560 * rockDensity), 5f, 470f, .42f, 1.45f, 2.2f);
        Scatter(rocks, rng, RockClass.Giant, 34, 22f, 440f, 1.6f, 4.6f, 1.6f);
        Scatter(rocks, rng, RockClass.Slab, 70, 9f, 320f, 2.2f, 7.5f, 1.4f);
        ScatterClusters(rocks, rng, 46);
        ScatterCraterEjecta(rocks, rng);

        var chunkGroups = new Dictionary<(int, int, RockClass), List<RockInstance>>();
        foreach (var rock in rocks)
        {
            if (rock.Class == RockClass.Giant || (rock.Class == RockClass.Boulder && rock.Size > .85f) || rock.Class == RockClass.Slab)
            {
                CreateIndividualRock(rock);
                continue;
            }
            var key = (Mathf.FloorToInt(rock.Position.x / 40f), Mathf.FloorToInt(rock.Position.z / 40f), rock.Class);
            if (!chunkGroups.TryGetValue(key, out var group)) chunkGroups[key] = group = new List<RockInstance>();
            group.Add(rock);
        }
        foreach (var pair in chunkGroups) CreateChunk(pair.Key.Item3, pair.Key.Item1, pair.Key.Item2, pair.Value);
    }

    private bool Excluded(float x, float z, float size)
    {
        foreach (var zone in exclusionZones)
        {
            var dx = x - zone.x; var dz = z - zone.y;
            var r = zone.z + size;
            if (dx * dx + dz * dz < r * r) return true;
        }
        return false;
    }

    private void AddRock(List<RockInstance> rocks, System.Random rng, RockClass cls, float x, float z, float size)
    {
        if (Excluded(x, z, size)) return;
        var y = SampleHeight(x, z);
        var normal = SampleNormal(x, z);
        var squash = cls == RockClass.Slab ? Mathf.Lerp(.16f, .3f, (float)rng.NextDouble()) : Mathf.Lerp(.5f, .85f, (float)rng.NextDouble());
        var stretch = Mathf.Lerp(.75f, 1.3f, (float)rng.NextDouble());
        var scale = new Vector3(size * stretch, size * squash, size);
        var sink = cls == RockClass.Slab ? .55f : Mathf.Lerp(.18f, .38f, (float)rng.NextDouble());
        var align = Quaternion.Slerp(Quaternion.identity, Quaternion.FromToRotation(Vector3.up, normal), cls == RockClass.Pebble ? 1f : .7f);
        var rotation = align * Quaternion.Euler((float)rng.NextDouble() * 12f - 6f, (float)rng.NextDouble() * 360f, (float)rng.NextDouble() * 12f - 6f);
        var position = new Vector3(x, y - scale.y * sink, z);
        int material;
        if (cls == RockClass.Slab) material = 2;
        else
        {
            var roll = rng.NextDouble();
            material = roll < .55 ? 0 : roll < .88 ? 1 : 2;
        }
        rocks.Add(new RockInstance
        {
            Class = cls,
            Variant = rng.Next(0, RockMeshLibrary.VariantCount),
            Material = material,
            Matrix = Matrix4x4.TRS(position, rotation, scale),
            Size = size,
            Position = position,
        });
    }

    private void Scatter(List<RockInstance> rocks, System.Random rng, RockClass cls, int count, float minRadius, float maxRadius, float minSize, float maxSize, float sizeExponent)
    {
        for (var i = 0; i < count; i++)
        {
            var angle = (float)rng.NextDouble() * Mathf.PI * 2f;
            var dist = Mathf.Lerp(minRadius, maxRadius, Mathf.Pow((float)rng.NextDouble(), .85f));
            var x = Mathf.Cos(angle) * dist; var z = Mathf.Sin(angle) * dist;
            // Patchy distribution: thin out rocks in dust-covered areas and on dunes.
            var density = MarsNoise.Fbm((x + 4096f) * .03f, (z + 4096f) * .03f, 2) * .5f + .55f;
            if (rng.NextDouble() > density) continue;
            var size = Mathf.Lerp(minSize, maxSize, Mathf.Pow((float)rng.NextDouble(), sizeExponent));
            AddRock(rocks, rng, cls, x, z, size);
        }
    }

    private void ScatterClusters(List<RockInstance> rocks, System.Random rng, int clusters)
    {
        for (var c = 0; c < clusters; c++)
        {
            var angle = (float)rng.NextDouble() * Mathf.PI * 2f;
            var dist = Mathf.Lerp(9f, 260f, (float)rng.NextDouble());
            var cx = Mathf.Cos(angle) * dist; var cz = Mathf.Sin(angle) * dist;
            AddRock(rocks, rng, RockClass.Boulder, cx, cz, Mathf.Lerp(.7f, 1.6f, (float)rng.NextDouble()));
            var members = rng.Next(7, 18);
            for (var i = 0; i < members; i++)
            {
                var a = (float)rng.NextDouble() * Mathf.PI * 2f;
                var d = Mathf.Lerp(.8f, 4.5f, (float)rng.NextDouble());
                AddRock(rocks, rng, i % 4 == 0 ? RockClass.Boulder : RockClass.Stone, cx + Mathf.Cos(a) * d, cz + Mathf.Sin(a) * d,
                    i % 4 == 0 ? Mathf.Lerp(.42f, .8f, (float)rng.NextDouble()) : Mathf.Lerp(.12f, .4f, (float)rng.NextDouble()));
            }
        }
    }

    private void ScatterCraterEjecta(List<RockInstance> rocks, System.Random rng)
    {
        foreach (var crater in craters)
        {
            if (crater.Radius < 10f || crater.Radius > 100f) continue;
            var count = Mathf.RoundToInt(crater.Radius * 2.2f);
            for (var i = 0; i < count; i++)
            {
                var a = (float)rng.NextDouble() * Mathf.PI * 2f;
                var d = crater.Radius * Mathf.Lerp(.95f, 1.7f, Mathf.Pow((float)rng.NextDouble(), 1.6f));
                var size = Mathf.Lerp(.15f, crater.Radius * .045f + .5f, Mathf.Pow((float)rng.NextDouble(), 2.4f));
                AddRock(rocks, rng, size > .42f ? RockClass.Boulder : RockClass.Stone,
                    crater.Centre.x + Mathf.Cos(a) * d, crater.Centre.y + Mathf.Sin(a) * d, size);
            }
        }
    }

    private static int SubdivisionFor(RockClass cls) => cls switch
    {
        RockClass.Pebble => 1,
        RockClass.Stone => 2,
        RockClass.Boulder => 3,
        _ => 4,
    };

    private void CreateIndividualRock(RockInstance rock)
    {
        var go = new GameObject(rock.Class == RockClass.Slab ? "Outcrop Slab" : "Boulder") { hideFlags = HideFlags.DontSave };
        go.isStatic = true;
        go.transform.SetParent(generatedRoot.transform, false);
        go.transform.SetPositionAndRotation(rock.Matrix.GetPosition(), rock.Matrix.rotation);
        go.transform.localScale = rock.Matrix.lossyScale;
        var top = SubdivisionFor(rock.Class);
        var lods = new List<LOD>();
        var thresholds = new[] { .09f, .025f, .004f };
        for (var level = 0; level < 3 && top - level >= 1; level++)
        {
            var lodGo = new GameObject("LOD" + level) { hideFlags = HideFlags.DontSave };
            lodGo.transform.SetParent(go.transform, false);
            lodGo.AddComponent<MeshFilter>().sharedMesh = RockMeshLibrary.Get(rock.Variant, top - level);
            var mr = lodGo.AddComponent<MeshRenderer>();
            mr.sharedMaterial = rockMaterials[rock.Material];
            mr.shadowCastingMode = ShadowCastingMode.On;
            lods.Add(new LOD(thresholds[Mathf.Min(level, thresholds.Length - 1)], new Renderer[] { mr }));
        }
        go.AddComponent<LODGroup>().SetLODs(lods.ToArray());
        if (rock.Size > .8f)
        {
            var collider = go.AddComponent<MeshCollider>();
            collider.sharedMesh = RockMeshLibrary.Get(rock.Variant, 2);
            // These are static world meshes; a non-convex collider preserves the complete
            // rock silhouette and avoids Unity's convex-hull triangle cap warnings.
            collider.convex = false;
        }
    }

    private void CreateChunk(RockClass cls, int cx, int cz, List<RockInstance> members)
    {
        var subdiv = SubdivisionFor(cls);
        var perMaterial = new List<CombineInstance>[rockMaterials.Length];
        for (var m = 0; m < perMaterial.Length; m++) perMaterial[m] = new List<CombineInstance>();
        var origin = new Vector3(cx * 40f + 20f, members[0].Position.y, cz * 40f + 20f);
        var toLocal = Matrix4x4.Translate(-origin);
        foreach (var rock in members)
            perMaterial[rock.Material].Add(new CombineInstance { mesh = RockMeshLibrary.Get(rock.Variant, subdiv), transform = toLocal * rock.Matrix });

        var parts = new List<CombineInstance>();
        var materials = new List<Material>();
        for (var m = 0; m < perMaterial.Length; m++)
        {
            if (perMaterial[m].Count == 0) continue;
            var part = new Mesh { indexFormat = IndexFormat.UInt32, hideFlags = HideFlags.DontSave };
            part.CombineMeshes(perMaterial[m].ToArray(), true, true);
            parts.Add(new CombineInstance { mesh = part, transform = Matrix4x4.identity });
            materials.Add(rockMaterials[m]);
        }
        var mesh = new Mesh { name = $"{cls} chunk {cx},{cz}", indexFormat = IndexFormat.UInt32, hideFlags = HideFlags.DontSave };
        mesh.CombineMeshes(parts.ToArray(), false, false);
        foreach (var part in parts) DestroySafe(part.mesh);
        mesh.RecalculateBounds();

        var go = new GameObject(mesh.name) { hideFlags = HideFlags.DontSave };
        go.isStatic = true;
        go.transform.SetParent(generatedRoot.transform, false);
        go.transform.position = origin;
        go.AddComponent<MeshFilter>().sharedMesh = mesh;
        var renderer = go.AddComponent<MeshRenderer>();
        renderer.sharedMaterials = materials.ToArray();
        renderer.shadowCastingMode = cls == RockClass.Pebble ? ShadowCastingMode.Off : ShadowCastingMode.On;
        var cull = cls == RockClass.Pebble ? .05f : cls == RockClass.Stone ? .018f : .006f;
        go.AddComponent<LODGroup>().SetLODs(new[] { new LOD(cull, new Renderer[] { renderer }) });
    }

    private static void DestroySafe(Object o)
    {
        if (Application.isPlaying) Destroy(o);
        else DestroyImmediate(o);
    }
}

/// <summary>Procedurally fractured, non-spherical rock meshes shared by every rock instance.</summary>
public static class RockMeshLibrary
{
    public const int VariantCount = 14;
    private static readonly Dictionary<(int, int), Mesh> Cache = new Dictionary<(int, int), Mesh>();

    public static Mesh Get(int variant, int subdivisions)
    {
        if (Cache.TryGetValue((variant, subdivisions), out var mesh) && mesh != null) return mesh;
        mesh = Build(variant, subdivisions);
        Cache[(variant, subdivisions)] = mesh;
        return mesh;
    }

    private static Mesh Build(int variant, int subdivisions)
    {
        Icosphere(subdivisions, out var vertices, out var triangles);
        var rng = new System.Random(variant * 7919 + 13);
        var offset = new Vector3((float)rng.NextDouble() * 50f, (float)rng.NextDouble() * 50f, (float)rng.NextDouble() * 50f);
        var cuts = rng.Next(4, 8);
        var planes = new Vector4[cuts];
        for (var i = 0; i < cuts; i++)
        {
            var n = new Vector3((float)rng.NextDouble() * 2f - 1f, (float)rng.NextDouble() * 1.4f - .4f, (float)rng.NextDouble() * 2f - 1f).normalized;
            planes[i] = new Vector4(n.x, n.y, n.z, Mathf.Lerp(.5f, .82f, (float)rng.NextDouble()));
        }
        var angular = Mathf.Lerp(.75f, .97f, (float)rng.NextDouble());
        for (var i = 0; i < vertices.Length; i++)
        {
            var v = vertices[i];
            var p = v * 1.35f + offset;
            var bump = MarsNoise.Fbm3(p, 3) * .2f + MarsNoise.Noise(p.x * 3.7f, p.y * 3.7f, p.z * 3.7f) * .055f;
            v *= 1f + bump;
            // Fracture planes give the angular, broken faces of weathered basalt.
            foreach (var plane in planes)
            {
                var n = new Vector3(plane.x, plane.y, plane.z);
                var d = Vector3.Dot(v, n) - plane.w;
                if (d > 0f) v -= n * d * angular;
            }
            if (v.y < -.38f) v.y = Mathf.Lerp(v.y, -.38f, .85f);
            // Small pits and chips that survive the plane cuts.
            v += v.normalized * MarsNoise.Noise(p.x * 9f, p.y * 9f, p.z * 9f) * .018f;
            vertices[i] = v;
        }
        var uv = new Vector2[vertices.Length];
        var mesh = new Mesh { name = $"Mars Rock v{variant} s{subdivisions}", hideFlags = HideFlags.DontSave };
        mesh.vertices = vertices;
        mesh.triangles = triangles;
        mesh.RecalculateNormals();
        var normals = mesh.normals;
        for (var i = 0; i < vertices.Length; i++)
        {
            var n = normals[i];
            var a = new Vector3(Mathf.Abs(n.x), Mathf.Abs(n.y), Mathf.Abs(n.z));
            var v = vertices[i] * .8f;
            uv[i] = a.y >= a.x && a.y >= a.z ? new Vector2(v.x, v.z) : a.x >= a.z ? new Vector2(v.z, v.y) : new Vector2(v.x, v.y);
        }
        mesh.uv = uv;
        mesh.RecalculateTangents();
        mesh.RecalculateBounds();
        mesh.UploadMeshData(false);
        return mesh;
    }

    private static void Icosphere(int subdivisions, out Vector3[] vertices, out int[] triangles)
    {
        var t = (1f + Mathf.Sqrt(5f)) / 2f;
        var verts = new List<Vector3>
        {
            new Vector3(-1, t, 0), new Vector3(1, t, 0), new Vector3(-1, -t, 0), new Vector3(1, -t, 0),
            new Vector3(0, -1, t), new Vector3(0, 1, t), new Vector3(0, -1, -t), new Vector3(0, 1, -t),
            new Vector3(t, 0, -1), new Vector3(t, 0, 1), new Vector3(-t, 0, -1), new Vector3(-t, 0, 1),
        };
        for (var i = 0; i < verts.Count; i++) verts[i] = verts[i].normalized;
        var faces = new List<int>
        {
            0,11,5, 0,5,1, 0,1,7, 0,7,10, 0,10,11, 1,5,9, 5,11,4, 11,10,2, 10,7,6, 7,1,8,
            3,9,4, 3,4,2, 3,2,6, 3,6,8, 3,8,9, 4,9,5, 2,4,11, 6,2,10, 8,6,7, 9,8,1,
        };
        for (var s = 0; s < subdivisions; s++)
        {
            var cache = new Dictionary<long, int>();
            var next = new List<int>(faces.Count * 4);
            int Mid(int a, int b)
            {
                var key = a < b ? ((long)a << 32) | (uint)b : ((long)b << 32) | (uint)a;
                if (cache.TryGetValue(key, out var idx)) return idx;
                verts.Add(((verts[a] + verts[b]) * .5f).normalized);
                return cache[key] = verts.Count - 1;
            }
            for (var i = 0; i < faces.Count; i += 3)
            {
                int a = faces[i], b = faces[i + 1], c = faces[i + 2];
                int ab = Mid(a, b), bc = Mid(b, c), ca = Mid(c, a);
                next.AddRange(new[] { a, ab, ca, b, bc, ab, c, ca, bc, ab, bc, ca });
            }
            faces = next;
        }
        vertices = verts.ToArray();
        triangles = faces.ToArray();
    }
}
