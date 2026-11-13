using UnityEngine.InputSystem;

/// <summary>
/// Input System actions for the RealLook preview (the project runs with the
/// new Input System only, so the legacy UnityEngine.Input API must not be used).
/// </summary>
public sealed class MarsInput : System.IDisposable
{
    public readonly InputAction Move = new InputAction("Move", InputActionType.Value);
    public readonly InputAction Look = new InputAction("Look", InputActionType.Value);
    public readonly InputAction Sprint = new InputAction("Sprint", InputActionType.Button);
    public readonly InputAction Jump = new InputAction("Jump", InputActionType.Button);
    public readonly InputAction Interact = new InputAction("Interact", InputActionType.Button);
    public readonly InputAction Pause = new InputAction("Pause", InputActionType.Button);
    public readonly InputAction ToggleHud = new InputAction("ToggleHud", InputActionType.Button);
    public readonly InputAction[] Shots = new InputAction[5];

    public MarsInput()
    {
        Move.AddCompositeBinding("2DVector")
            .With("Up", "<Keyboard>/w").With("Down", "<Keyboard>/s")
            .With("Left", "<Keyboard>/a").With("Right", "<Keyboard>/d");
        Move.AddCompositeBinding("2DVector")
            .With("Up", "<Keyboard>/upArrow").With("Down", "<Keyboard>/downArrow")
            .With("Left", "<Keyboard>/leftArrow").With("Right", "<Keyboard>/rightArrow");
        Move.AddBinding("<Gamepad>/leftStick");

        Look.AddBinding("<Mouse>/delta").WithProcessor("scaleVector2(x=0.05,y=0.05)");
        Look.AddBinding("<Gamepad>/rightStick").WithProcessor("scaleVector2(x=2.4,y=2.4)");

        Sprint.AddBinding("<Keyboard>/leftShift");
        Sprint.AddBinding("<Keyboard>/rightShift");
        Sprint.AddBinding("<Gamepad>/leftStickPress");
        Jump.AddBinding("<Keyboard>/space");
        Jump.AddBinding("<Gamepad>/buttonSouth");
        Interact.AddBinding("<Keyboard>/e");
        Interact.AddBinding("<Gamepad>/buttonWest");
        Pause.AddBinding("<Keyboard>/escape");
        Pause.AddBinding("<Gamepad>/start");
        ToggleHud.AddBinding("<Keyboard>/h");
        for (var i = 0; i < Shots.Length; i++)
        {
            Shots[i] = new InputAction("Shot" + (i + 1), InputActionType.Button);
            Shots[i].AddBinding("<Keyboard>/" + (i + 1));
        }
    }

    public void Enable()
    {
        foreach (var action in All()) action.Enable();
    }

    public void Dispose()
    {
        foreach (var action in All()) action.Dispose();
    }

    private System.Collections.Generic.IEnumerable<InputAction> All()
    {
        yield return Move; yield return Look; yield return Sprint; yield return Jump;
        yield return Interact; yield return Pause; yield return ToggleHud;
        foreach (var shot in Shots) yield return shot;
    }
}
