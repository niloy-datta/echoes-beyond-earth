using Unity.VisualScripting;

/// <summary>
/// Visual Scripting action used by the Rover Evidence graph. The playable
/// interaction raises a named event; this node turns its evidence payload into
/// the scene's accessible, on-screen science brief.
/// </summary>
[UnitTitle("Present Rover Evidence")]
[UnitCategory("Mars Rover / Science")]
public sealed class RoverEvidenceFlowUnit : Unit
{
    [DoNotSerialize] public ControlInput enter { get; private set; }
    [DoNotSerialize] public ControlOutput exit { get; private set; }
    [DoNotSerialize] public ValueInput roverName { get; private set; }
    [DoNotSerialize] public ValueInput evidence { get; private set; }
    [DoNotSerialize] public ValueInput target { get; private set; }

    protected override void Definition()
    {
        enter = ControlInput(nameof(enter), Present);
        exit = ControlOutput(nameof(exit));
        roverName = ValueInput<object>(nameof(roverName));
        evidence = ValueInput<object>(nameof(evidence));
        target = ValueInput<UnityEngine.GameObject>(nameof(target), null).NullMeansSelf();
        Requirement(roverName, enter);
        Requirement(evidence, enter);
        Requirement(target, enter);
        Succession(enter, exit);
    }

    private ControlOutput Present(Flow flow)
    {
        var owner = flow.GetValue<UnityEngine.GameObject>(target);
        var name = flow.GetValue<object>(roverName)?.ToString() ?? "Mars rover";
        var fact = flow.GetValue<object>(evidence)?.ToString() ?? "NASA mission record selected.";
        owner?.GetComponent<RealLookBootstrap>()?.PresentScienceBrief(name, fact);
        return exit;
    }
}
