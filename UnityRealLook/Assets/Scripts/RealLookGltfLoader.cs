using System.Collections;
using System.IO;
using GLTFast;
using UnityEngine;

/// <summary>Loads a production GLB at runtime without baking it into generated scene YAML.</summary>
public sealed class RealLookGltfLoader : MonoBehaviour
{
    [SerializeField] private string relativePath;
    [SerializeField] private float importScale = 1f;
    [SerializeField] private bool alignToTerrain;

    public void Configure(string path, float scale, bool alignGround)
    {
        relativePath = path;
        importScale = scale;
        alignToTerrain = alignGround;
    }

    private IEnumerator Start()
    {
        var fullPath = Path.Combine(Application.streamingAssetsPath, relativePath);
        if (!File.Exists(fullPath))
        {
            Debug.LogError($"Real Look model missing: {fullPath}");
            yield break;
        }

        var import = new GltfImport();
        var load = import.Load(fullPath);
        yield return new WaitUntil(() => load.IsCompleted);
        if (!load.Result)
        {
            Debug.LogError($"Real Look model failed to decode: {relativePath}");
            yield break;
        }

        var instantiate = import.InstantiateMainSceneAsync(transform);
        yield return new WaitUntil(() => instantiate.IsCompleted);
        if (!instantiate.Result)
        {
            Debug.LogError($"Real Look model failed to instantiate: {relativePath}");
            yield break;
        }

        transform.localScale = Vector3.one * importScale;
        foreach (var renderer in GetComponentsInChildren<Renderer>())
        {
            renderer.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.On;
            renderer.receiveShadows = true;
        }
        if (alignToTerrain) StartCoroutine(AlignToGround());
        Debug.Log($"Real Look model instantiated: {relativePath}");
    }

    private IEnumerator AlignToGround()
    {
        yield return null;
        var renderers = GetComponentsInChildren<Renderer>();
        if (renderers.Length == 0) yield break;
        var lowest = float.MaxValue;
        foreach (var renderer in renderers) lowest = Mathf.Min(lowest, renderer.bounds.min.y);
        if (Physics.Raycast(transform.position + Vector3.up * 20f, Vector3.down, out var hit, 80f))
            transform.position += Vector3.up * (hit.point.y - lowest + .015f);
    }
}
