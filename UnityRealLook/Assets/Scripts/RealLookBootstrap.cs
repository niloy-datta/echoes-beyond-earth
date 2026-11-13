using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>
/// Third-person exploration controls for the RealLook Mars preview: Input
/// System movement, mouse-look orbit camera with collision, Mars gravity,
/// animation state selection and footstep dust. The full five-chapter game
/// remains in the browser implementation; this scene is a visual benchmark.
/// </summary>
public sealed class RealLookBootstrap : MonoBehaviour
{
    public const float MarsGravity = 3.71f;

    [SerializeField] private Transform explorer;
    [SerializeField] private Animator explorerAnimator;
    [SerializeField] private Transform rover;
    [SerializeField] private ParticleSystem footstepDust;
    [SerializeField] private float walkSpeed = 1.55f;
    [SerializeField] private float runSpeed = 3.3f;
    [SerializeField] private float jumpSpeed = 2.6f;
    [SerializeField] private float lookSensitivity = 1f;
    [SerializeField] private float cameraDistance = 4.4f;

    private Camera sceneCamera;
    private CharacterController controller;
    private CinematicShotDirector shotDirector;
    private RoverShowcaseController roverShowcase;
    private MarsInput input;
    private Transform footL, footR;
    private float yaw;
    private float pitch = 12f;
    private float verticalVelocity;
    private float planarSpeed;
    private float actionTimer;
    private float stepTimer;
    private bool nextStepLeft;
    private bool wasGrounded = true;
    private bool paused;
    private bool showHud = true;
    private string currentState = "";
    private string statusMessage = "";
    private float statusTimer;

    public static bool AutomationActive { get; set; }
    public bool IsGrounded => controller != null && controller.isGrounded;
    public float PlanarSpeed => planarSpeed;
    public string AnimationState => currentState;
    public Transform Explorer => explorer;

    public void Configure(Transform explorerRoot, Animator animator, Transform roverRoot, ParticleSystem dust)
    {
        explorer = explorerRoot;
        explorerAnimator = animator;
        rover = roverRoot;
        footstepDust = dust;
    }

    private void Awake()
    {
        input = new MarsInput();
    }

    private void OnEnable() => input?.Enable();

    private void OnDestroy() => input?.Dispose();

    private void Start()
    {
        if (explorer == null) explorer = GameObject.Find("Astronaut")?.transform;
        sceneCamera = Camera.main;
        shotDirector = GetComponent<CinematicShotDirector>();
        roverShowcase = GetComponent<RoverShowcaseController>();
        if (explorer == null || sceneCamera == null) return;
        controller = explorer.GetComponent<CharacterController>();
        if (explorerAnimator == null) explorerAnimator = explorer.GetComponentInChildren<Animator>();
        foreach (var t in explorer.GetComponentsInChildren<Transform>())
        {
            if (t.name == "foot_L") footL = t;
            if (t.name == "foot_R") footR = t;
        }
        yaw = explorer.eulerAngles.y;
        SnapToGround();
        // The rover archive is click-selectable; the right mouse button is used for orbit.
        SetCursorLocked(false);
        PlayState("idle", 0f);
        UpdateCamera(true);
    }

    private void SnapToGround()
    {
        var origin = explorer.position + Vector3.up * 50f;
        if (Physics.Raycast(origin, Vector3.down, out var hit, 200f, ~(1 << 2), QueryTriggerInteraction.Ignore))
        {
            if (controller != null) controller.enabled = false;
            explorer.position = hit.point + Vector3.up * .02f;
            if (controller != null) controller.enabled = true;
        }
    }

    private void Update()
    {
        if (input == null || explorer == null || sceneCamera == null) return;
        if (input.Pause.WasPressedThisFrame()) TogglePause();
        if (input.ToggleHud.WasPressedThisFrame()) showHud = !showHud;
        if (statusTimer > 0f) statusTimer -= Time.unscaledDeltaTime;
        if (paused) return;

        var cinematic = shotDirector != null && shotDirector.UsesCinematicCamera;
        if (!cinematic) RotateCamera();
        MoveExplorer(cinematic);
        if (input.Interact.WasPressedThisFrame()) Interact();
        if (!cinematic) UpdateCamera(false);
    }

    private void RotateCamera()
    {
        if (roverShowcase != null) return;
        var mouse = Mouse.current;
        var mouseOrbit = mouse != null && mouse.rightButton.isPressed;
        var look = input.Look.ReadValue<Vector2>() * lookSensitivity;
        if (mouse != null && !mouseOrbit) look = Vector2.zero;
        yaw += look.x;
        pitch = Mathf.Clamp(pitch - look.y, -12f, 55f);
    }

    private void MoveExplorer(bool cinematic)
    {
        var stick = cinematic ? Vector2.zero : input.Move.ReadValue<Vector2>();
        var flatYaw = Quaternion.Euler(0f, yaw, 0f);
        var move = flatYaw * new Vector3(stick.x, 0f, stick.y);
        if (move.sqrMagnitude > 1f) move.Normalize();
        var running = input.Sprint.IsPressed() && move.sqrMagnitude > .01f;
        var targetSpeed = move.magnitude * (running ? runSpeed : walkSpeed);
        if (actionTimer > 0f)
        {
            actionTimer -= Time.deltaTime;
            targetSpeed = 0f;
        }
        planarSpeed = Mathf.MoveTowards(planarSpeed, targetSpeed, (targetSpeed > planarSpeed ? 6f : 9f) * Time.deltaTime);

        if (move.sqrMagnitude > .001f && actionTimer <= 0f)
        {
            var targetRotation = Quaternion.LookRotation(move, Vector3.up);
            explorer.rotation = Quaternion.RotateTowards(explorer.rotation, targetRotation, 420f * Time.deltaTime);
        }

        var grounded = controller != null && controller.isGrounded;
        if (grounded && verticalVelocity < 0f) verticalVelocity = -1f;
        if (grounded && actionTimer <= 0f && input.Jump.WasPressedThisFrame())
        {
            verticalVelocity = jumpSpeed;
            PlayState("jump", .08f);
        }
        verticalVelocity -= MarsGravity * Time.deltaTime;

        var velocity = explorer.forward * planarSpeed + Vector3.up * verticalVelocity;
        if (controller != null) controller.Move(velocity * Time.deltaTime);
        else explorer.position += velocity * Time.deltaTime;

        grounded = controller != null && controller.isGrounded;
        if (grounded && !wasGrounded)
        {
            PlayState("land", .06f);
            actionTimer = Mathf.Max(actionTimer, .25f);
            EmitDust(footL, 10); EmitDust(footR, 10);
        }
        wasGrounded = grounded;

        if (grounded && actionTimer <= 0f)
        {
            if (planarSpeed > 2.2f) PlayState("run", .22f);
            else if (planarSpeed > .15f) PlayState("walk", .22f);
            else PlayState("idle", .3f);
            UpdateFootsteps();
        }
        else if (!grounded && verticalVelocity < -.5f && currentState != "jump")
        {
            PlayState("jump", .2f);
        }

        if (explorerAnimator != null)
        {
            explorerAnimator.speed = currentState == "walk" ? Mathf.Clamp(planarSpeed / walkSpeed, .6f, 1.25f)
                : currentState == "run" ? Mathf.Clamp(planarSpeed / runSpeed, .75f, 1.2f) : 1f;
        }
    }

    private void UpdateFootsteps()
    {
        if (planarSpeed < .3f) { stepTimer = 0f; return; }
        stepTimer -= Time.deltaTime;
        if (stepTimer > 0f) return;
        stepTimer = planarSpeed > 2.2f ? .34f : .52f;
        EmitDust(nextStepLeft ? footL : footR, planarSpeed > 2.2f ? 7 : 4);
        nextStepLeft = !nextStepLeft;
    }

    private void EmitDust(Transform foot, int count)
    {
        if (footstepDust == null) return;
        var position = foot != null ? foot.position : explorer.position;
        var emit = new ParticleSystem.EmitParams { position = position + Vector3.up * .04f, applyShapeToPosition = true };
        footstepDust.Emit(emit, count);
    }

    private void PlayState(string state, float fade)
    {
        if (explorerAnimator == null || currentState == state) return;
        currentState = state;
        explorerAnimator.CrossFadeInFixedTime(state, fade);
    }

    private void Interact()
    {
        if (roverShowcase != null && roverShowcase.SelectedModel != null)
        {
            var parts = roverShowcase.Entries[roverShowcase.SelectedIndex].parts;
            if (parts != null && parts.Length > 0) roverShowcase.Inspect(0);
        }
        if (rover != null && Vector3.Distance(explorer.position, rover.position) <= 4.5f)
        {
            PlayState("interact", .15f);
            actionTimer = 2.2f;
            Unity.VisualScripting.CustomEvent.Trigger(gameObject, "Rover.Evidence.Recovered",
                "Opportunity · mission record",
                "NASA records 45.16 km travelled. The solar-powered rover was designed for a 90-sol mission and operated for nearly 15 years. NASA/JPL Opportunity mission record.");
        }
        else
        {
            PlayState("scan", .15f);
            actionTimer = 2.4f;
            ShowStatus("Surface check complete. Move closer to the Opportunity rover to inspect its mission record.");
        }
        Debug.Log("[RealLook] Interact: " + statusMessage);
    }

    public void SetRover(Transform roverRoot)
    {
        rover = roverRoot;
    }

    public void PresentScienceBrief(string title, string evidence)
    {
        statusMessage = "<color=#63E6EF>SCIENCE BRIEF  /  " + title + "</color>\n" + evidence;
        statusTimer = 12f;
        Debug.Log("[RealLook] Visual Script evidence: " + title + " — " + evidence);
    }

    private void ShowStatus(string message)
    {
        statusMessage = message;
        statusTimer = 4f;
    }

    private void TogglePause()
    {
        paused = !paused;
        Time.timeScale = paused ? 0f : 1f;
        SetCursorLocked(!paused && !AutomationActive);
        Debug.Log(paused ? "[RealLook] Paused." : "[RealLook] Resumed.");
    }

    private static void SetCursorLocked(bool locked)
    {
        Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
        Cursor.visible = !locked;
    }

    public void UpdateCamera(bool instant)
    {
        var rotation = Quaternion.Euler(pitch, yaw, 0f);
        var pivot = explorer.position + Vector3.up * 1.62f + rotation * new Vector3(.42f, 0f, 0f);
        var desiredOffset = rotation * new Vector3(0f, .25f, -cameraDistance);
        var distance = desiredOffset.magnitude;
        // Pull the camera in front of rocks or terrain between it and the astronaut.
        if (Physics.SphereCast(pivot, .22f, desiredOffset.normalized, out var hit, distance, ~(1 << 2), QueryTriggerInteraction.Ignore))
            distance = Mathf.Max(.6f, hit.distance - .05f);
        var desired = pivot + desiredOffset.normalized * distance;
        if (Physics.Raycast(desired + Vector3.up * 20f, Vector3.down, out var ground, 40f, ~(1 << 2), QueryTriggerInteraction.Ignore))
            desired.y = Mathf.Max(desired.y, ground.point.y + .35f);
        var t = sceneCamera.transform;
        t.position = instant ? desired : Vector3.Lerp(t.position, desired, 1f - Mathf.Exp(-14f * Time.deltaTime));
        t.rotation = Quaternion.LookRotation(pivot - t.position, Vector3.up);
        if (instant) sceneCamera.fieldOfView = 55f;
    }

    private void OnGUI()
    {
        if (AutomationActive) return;
        var style = new GUIStyle(GUI.skin.label) { fontSize = 14 };
        style.normal.textColor = new Color(1f, .93f, .85f, .9f);
        if (paused)
        {
            var big = new GUIStyle(style) { fontSize = 30, alignment = TextAnchor.MiddleCenter };
            GUI.Label(new Rect(0, Screen.height * .4f, Screen.width, 50), "PAUSED — press Esc to resume", big);
        }
        if (statusTimer > 0f)
        {
            var panel = new Rect(24, Screen.height - 190, Mathf.Min(760f, Screen.width - 48f), 110f);
            var oldColor = GUI.color;
            GUI.color = new Color(.18f, .88f, .93f, .72f);
            GUI.DrawTexture(new Rect(panel.x, panel.y, panel.width, 1f), Texture2D.whiteTexture);
            GUI.DrawTexture(new Rect(panel.x, panel.y + panel.height - 1f, panel.width, 1f), Texture2D.whiteTexture);
            GUI.DrawTexture(new Rect(panel.x, panel.y, 1f, panel.height), Texture2D.whiteTexture);
            GUI.DrawTexture(new Rect(panel.x + panel.width - 1f, panel.y, 1f, panel.height), Texture2D.whiteTexture);
            GUI.color = new Color(.025f, .045f, .065f, .96f);
            GUI.DrawTexture(new Rect(panel.x + 1f, panel.y + 1f, panel.width - 2f, panel.height - 2f), Texture2D.whiteTexture);
            GUI.color = new Color(.39f, .9f, .94f, .9f);
            GUI.Label(new Rect(panel.x + 16f, panel.y + 10f, panel.width - 32f, 20f), "FIELD ARCHIVE     /     NASA MISSION RECORD", new GUIStyle(style) { fontSize = 10, fontStyle = FontStyle.Bold, richText = false, normal = { textColor = new Color(.39f, .9f, .94f) } });
            GUI.color = Color.white;
            var brief = new GUIStyle(style) { fontSize = 14, richText = true, wordWrap = true, padding = new RectOffset(15, 15, 0, 8), normal = { textColor = new Color(.88f, .93f, .95f) } };
            GUI.Label(new Rect(panel.x + 1f, panel.y + 30f, panel.width - 2f, panel.height - 32f), statusMessage, brief);
            GUI.color = oldColor;
        }
        if (!showHud) return;
        var previous = GUI.color;
        var panelColor = new Color(.025f, .045f, .065f, .82f);
        var accent = new Color(.39f, .9f, .94f, .92f);
        DrawHudPanel(new Rect(24, 22, 310, 86), panelColor, accent);
        var eyebrow = new GUIStyle(style) { fontSize = 9, fontStyle = FontStyle.Bold, richText = false };
        eyebrow.normal.textColor = accent;
        GUI.Label(new Rect(42, 34, 270, 16), "MARS EXPLORATION  /  SOL 5,114", eyebrow);
        var title = new GUIStyle(style) { fontSize = 19, fontStyle = FontStyle.Bold, richText = false };
        title.normal.textColor = Color.white;
        var selectedName = roverShowcase != null && roverShowcase.Entries.Length > 0
            ? roverShowcase.Entries[roverShowcase.SelectedIndex].name.ToUpperInvariant()
            : "OPPORTUNITY  ·  MER-B";
        GUI.Label(new Rect(40, 49, 275, 27), selectedName, title);
        var caption = new GUIStyle(style) { fontSize = 10, richText = false };
        caption.normal.textColor = new Color(.72f, .79f, .82f, .95f);
        var selectedSite = roverShowcase != null && roverShowcase.Entries.Length > 0
            ? roverShowcase.Entries[roverShowcase.SelectedIndex].landingSite.ToUpperInvariant()
            : "MERIDIANI PLANUM     /     ENDEAVOUR CRATER";
        GUI.Label(new Rect(42, 79, 270, 16), selectedSite, caption);

        var shot = shotDirector != null ? shotDirector.ActiveShotName.ToUpperInvariant() : "FIELD CAMERA";
        var rightWidth = 230f;
        DrawHudPanel(new Rect(Screen.width - rightWidth - 24, 22, rightWidth, 43), panelColor, new Color(.93f, .58f, .34f, .95f));
        var shotStyle = new GUIStyle(eyebrow) { alignment = TextAnchor.MiddleCenter };
        shotStyle.normal.textColor = new Color(.97f, .77f, .62f);
        GUI.Label(new Rect(Screen.width - rightWidth - 16, 31, rightWidth - 16, 24), shot, shotStyle);

        var center = new Vector2(Screen.width * .5f, Screen.height * .5f);
        GUI.color = new Color(.72f, .91f, .9f, .55f);
        GUI.DrawTexture(new Rect(center.x - 9, center.y, 5, 1), Texture2D.whiteTexture);
        GUI.DrawTexture(new Rect(center.x + 4, center.y, 5, 1), Texture2D.whiteTexture);
        GUI.DrawTexture(new Rect(center.x, center.y - 9, 1, 5), Texture2D.whiteTexture);
        GUI.DrawTexture(new Rect(center.x, center.y + 4, 1, 5), Texture2D.whiteTexture);

        var controls = new Rect(24, Screen.height - 54, Mathf.Min(890f, Screen.width - 48f), 30f);
        DrawHudPanel(controls, panelColor, new Color(.39f, .9f, .94f, .5f));
        var controlsStyle = new GUIStyle(caption) { alignment = TextAnchor.MiddleLeft, padding = new RectOffset(12, 8, 0, 0) };
        controlsStyle.normal.textColor = new Color(.83f, .87f, .87f);
        GUI.Label(new Rect(controls.x, controls.y + 2, controls.width, controls.height - 4), "WASD MOVE     SHIFT RUN     SPACE JUMP     RMB ORBIT     WHEEL ZOOM     E INSPECT     TAB ROVER     1–5 SHOTS     H HUD", controlsStyle);
        GUI.color = previous;
    }

    private static void DrawHudPanel(Rect rect, Color fill, Color edge)
    {
        GUI.color = fill;
        GUI.DrawTexture(rect, Texture2D.whiteTexture);
        GUI.color = edge;
        GUI.DrawTexture(new Rect(rect.x, rect.y, rect.width, 1f), Texture2D.whiteTexture);
        GUI.DrawTexture(new Rect(rect.x, rect.y + rect.height - 1f, rect.width, 1f), Texture2D.whiteTexture);
        GUI.DrawTexture(new Rect(rect.x, rect.y, 1f, rect.height), Texture2D.whiteTexture);
        GUI.DrawTexture(new Rect(rect.x + rect.width - 1f, rect.y, 1f, rect.height), Texture2D.whiteTexture);
    }
}
