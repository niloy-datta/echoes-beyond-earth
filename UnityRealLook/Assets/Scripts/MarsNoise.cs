using UnityEngine;

/// <summary>
/// Thread-safe gradient noise (Ken Perlin's improved noise) used by the
/// deterministic terrain and rock generators. Pure functions only, so the
/// heightfield can be evaluated on worker threads.
/// </summary>
public static class MarsNoise
{
    private static readonly int[] Perm = BuildPermutation();

    private static int[] BuildPermutation()
    {
        int[] p =
        {
            151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
            190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,
            68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,
            102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,
            3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
            223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,
            112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,
            31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
        };
        var perm = new int[512];
        for (var i = 0; i < 512; i++) perm[i] = p[i & 255];
        return perm;
    }

    private static float Fade(float t) => t * t * t * (t * (t * 6f - 15f) + 10f);
    private static float Lerp(float a, float b, float t) => a + (b - a) * t;

    private static float Grad(int hash, float x, float y, float z)
    {
        var h = hash & 15;
        var u = h < 8 ? x : y;
        var v = h < 4 ? y : h == 12 || h == 14 ? x : z;
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
    }

    /// <summary>Gradient noise in roughly [-1, 1].</summary>
    public static float Noise(float x, float y, float z)
    {
        var xi = Mathf.FloorToInt(x);
        var yi = Mathf.FloorToInt(y);
        var zi = Mathf.FloorToInt(z);
        x -= xi; y -= yi; z -= zi;
        xi &= 255; yi &= 255; zi &= 255;
        var u = Fade(x); var v = Fade(y); var w = Fade(z);
        var a = Perm[xi] + yi; var aa = Perm[a] + zi; var ab = Perm[a + 1] + zi;
        var b = Perm[xi + 1] + yi; var ba = Perm[b] + zi; var bb = Perm[b + 1] + zi;
        return Lerp(
            Lerp(Lerp(Grad(Perm[aa], x, y, z), Grad(Perm[ba], x - 1, y, z), u),
                 Lerp(Grad(Perm[ab], x, y - 1, z), Grad(Perm[bb], x - 1, y - 1, z), u), v),
            Lerp(Lerp(Grad(Perm[aa + 1], x, y, z - 1), Grad(Perm[ba + 1], x - 1, y, z - 1), u),
                 Lerp(Grad(Perm[ab + 1], x, y - 1, z - 1), Grad(Perm[bb + 1], x - 1, y - 1, z - 1), u), v), w);
    }

    public static float Noise(float x, float z) => Noise(x, z, .5f);

    public static float Fbm(float x, float z, int octaves, float lacunarity = 2.03f, float gain = .5f)
    {
        float sum = 0f, amp = 1f, norm = 0f;
        for (var i = 0; i < octaves; i++)
        {
            sum += Noise(x, z, i * 17.13f + .5f) * amp;
            norm += amp;
            amp *= gain;
            x *= lacunarity; z *= lacunarity;
        }
        return sum / norm;
    }

    /// <summary>Ridged multifractal in [0, 1]; sharp crests like eroded ridgelines.</summary>
    public static float Ridged(float x, float z, int octaves)
    {
        float sum = 0f, amp = .5f, weight = 1f, norm = 0f;
        for (var i = 0; i < octaves; i++)
        {
            var n = 1f - Mathf.Abs(Noise(x, z, i * 9.7f + 3.1f));
            n *= n * weight;
            weight = Mathf.Clamp01(n * 2f);
            sum += n * amp;
            norm += amp;
            amp *= .5f;
            x *= 2.07f; z *= 2.07f;
        }
        return sum / norm;
    }

    public static float Fbm3(Vector3 p, int octaves)
    {
        float sum = 0f, amp = 1f, norm = 0f;
        for (var i = 0; i < octaves; i++)
        {
            sum += Noise(p.x, p.y, p.z) * amp;
            norm += amp;
            amp *= .5f;
            p *= 2.11f;
        }
        return sum / norm;
    }

    public static float SmoothStep(float a, float b, float x)
    {
        var t = Mathf.Clamp01((x - a) / (b - a));
        return t * t * (3f - 2f * t);
    }
}
