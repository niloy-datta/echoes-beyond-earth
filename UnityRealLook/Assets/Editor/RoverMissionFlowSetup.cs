using System;
using System.IO;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using Unity.VisualScripting;

/// <summary>Creates and integrates the editable Unity Visual Scripting graph.</summary>
public static class RoverMissionFlowSetup
{
    public const string GraphPath = "Assets/Art/Generated/RoverEvidence.asset";

    [MenuItem("Echoes/Build Rover Evidence Visual Script")]
    public static void BuildAndAttachToCurrentScene()
    {
        var graphAsset = BuildGraphAsset();
        if (EditorSceneManager.GetActiveScene().path != BuildRealLookScene.ScenePath)
            EditorSceneManager.OpenScene(BuildRealLookScene.ScenePath);

        var root = GameObject.Find("MarsRealLook");
        if (root == null) throw new InvalidOperationException("MarsRealLook root was not found in the active scene.");
        Attach(root, graphAsset);
        EditorSceneManager.MarkSceneDirty(root.scene);
        EditorSceneManager.SaveScene(root.scene);
        AssetDatabase.SaveAssets();
        EchoesEditorBridge.Log("RoverEvidence Visual Scripting graph created and attached to RealLook.unity");
    }

    public static void Attach(GameObject root, ScriptGraphAsset graphAsset = null)
    {
        graphAsset = graphAsset != null ? graphAsset : BuildGraphAsset();
        var machine = root.GetComponent<ScriptMachine>();
        if (machine == null) machine = root.AddComponent<ScriptMachine>();
        machine.nest.SwitchToMacro(graphAsset);
        EditorUtility.SetDirty(machine);
    }

    private static ScriptGraphAsset BuildGraphAsset()
    {
        Directory.CreateDirectory("Assets/Art/Generated");
        var asset = AssetDatabase.LoadAssetAtPath<ScriptGraphAsset>(GraphPath);
        if (asset == null)
        {
            asset = ScriptableObject.CreateInstance<ScriptGraphAsset>();
            AssetDatabase.CreateAsset(asset, GraphPath);
        }

        var graph = new FlowGraph();
        graph.title = "OPPORTUNITY  /  SCIENCE RECOVERY";
        graph.summary = "A rover interaction raises Rover.Evidence.Recovered. This flow routes the mission name and cited evidence into the in-world science brief.";
        graph.zoom = 0.9f;
        var signal = new CustomEvent { argumentCount = 2, position = new Vector2(-260f, 18f) };
        graph.units.Add(signal);
        signal.Define();
        signal.name.SetDefaultValue("Rover.Evidence.Recovered");

        var present = new RoverEvidenceFlowUnit { position = new Vector2(150f, 18f) };
        graph.units.Add(present);
        present.Define();

        graph.controlConnections.Add(new ControlConnection(signal.trigger, present.enter));
        signal.argumentPorts[0].ConnectToValid(present.roverName);
        signal.argumentPorts[1].ConnectToValid(present.evidence);

        asset.graph = graph;
        EditorUtility.SetDirty(asset);
        AssetDatabase.SaveAssets();
        AssetDatabase.ImportAsset(GraphPath, ImportAssetOptions.ForceUpdate);
        return AssetDatabase.LoadAssetAtPath<ScriptGraphAsset>(GraphPath);
    }

    [MenuItem("Echoes/Open Rover Evidence Flow")]
    public static void OpenRoverEvidenceFlow()
    {
        var graph = AssetDatabase.LoadAssetAtPath<ScriptGraphAsset>(GraphPath);
        if (graph == null) graph = BuildGraphAsset();
        Selection.activeObject = graph;
        AssetDatabase.OpenAsset(graph);
    }
}
