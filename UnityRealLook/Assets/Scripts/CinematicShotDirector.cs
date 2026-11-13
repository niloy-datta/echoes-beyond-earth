using UnityEngine;
using UnityEngine.Rendering;

/// <summary>
/// Reusable, art-directed camera presets. Keys 1–5 switch shots; shot 4 is
/// the playable third-person camera driven by <see cref="RealLookBootstrap"/>.
/// The same compositions are used by the editor and player screenshot tools.
/// </summary>
public sealed class CinematicShotDirector : MonoBehaviour
{
    public const int CloseUp = 0, AstronautAndRover = 1, Panorama = 2, ThirdPerson = 3, FinalCinematic = 4;

    public static readonly string[] ShotNames =
    {
        "A · Astronaut close-up",
        "B · Astronaut + Opportunity rover",
        "C · Wide Mars panorama",
        "D · Third-person exploration",
        "E · Final cinematic",
    };

    private static readonly float[] ShotFov = { 30f, 38f, 52f, 55f, 34f };

    [SerializeField] private Camera sceneCamera;
    [SerializeField] private Transform astronaut;
    [SerializeField] private Transform rover;
    [SerializeField] private Volume closeUpDepthOfField;
    [SerializeField] private Vector3 panoramaTarget = new Vector3(330f, 40f, 390f);

    private int activeView = ThirdPerson;
    private MarsInput input;

    public bool UsesCinematicCamera => activeView != ThirdPerson;
    public int ActiveView => activeView;
    public string ActiveShotName => ShotNames[activeView];

    public void SetRover(Transform roverTransform) => rover = roverTransform;

    public void Configure(Camera camera, Transform astronautTransform, Transform roverTransform, Volume depthOfField, Vector3 vista)
    {
        sceneCamera = camera;
        astronaut = astronautTransform;
        rover = roverTransform;
        closeUpDepthOfField = depthOfField;
        panoramaTarget = vista;
    }

    private void Awake() => input = new MarsInput();
    private void OnEnable() => input?.Enable();
    private void OnDestroy() => input?.Dispose();

    private void Update()
    {
        if (input == null)
        {
            input = new MarsInput();
            input.Enable();
        }
        for (var i = 0; i < input.Shots.Length; i++)
            if (input.Shots[i].WasPressedThisFrame()) SetView(i);
        if (!UsesCinematicCamera || sceneCamera == null || astronaut == null) return;
        Compose(activeView, out var position, out var rotation, out _);
        var k = 1f - Mathf.Exp(-4f * Time.deltaTime);
        sceneCamera.transform.SetPositionAndRotation(Vector3.Lerp(sceneCamera.transform.position, position, k), Quaternion.Slerp(sceneCamera.transform.rotation, rotation, k));
    }

    public void SetView(int view)
    {
        activeView = Mathf.Clamp(view, 0, ShotNames.Length - 1);
        if (closeUpDepthOfField != null) closeUpDepthOfField.weight = activeView == CloseUp || activeView == FinalCinematic ? 1f : 0f;
        if (sceneCamera == null || astronaut == null) return;
        if (activeView == ThirdPerson && Application.isPlaying)
        {
            var explorer = GetComponent<RealLookBootstrap>();
            if (explorer != null) explorer.UpdateCamera(true);
            return;
        }
        Compose(activeView, out var position, out var rotation, out var fov);
        sceneCamera.transform.SetPositionAndRotation(position, rotation);
        sceneCamera.fieldOfView = fov;
        FocusDepthOfField(Vector3.Distance(position, astronaut.position + Vector3.up * 1.5f));
    }

    private void FocusDepthOfField(float distance)
    {
        if (closeUpDepthOfField == null) return;
        var profile = Application.isPlaying ? closeUpDepthOfField.profile : closeUpDepthOfField.sharedProfile;
        if (profile != null && profile.TryGet<UnityEngine.Rendering.Universal.DepthOfField>(out var dof))
            dof.focusDistance.Override(distance);
    }

    /// <summary>Computes a shot relative to the astronaut, rover and terrain.</summary>
    public void Compose(int view, out Vector3 position, out Quaternion rotation, out float fov)
    {
        fov = ShotFov[Mathf.Clamp(view, 0, ShotFov.Length - 1)];
        var forward = Vector3.ProjectOnPlane(astronaut.forward, Vector3.up).normalized;
        var right = Vector3.Cross(Vector3.up, forward);
        var head = astronaut.position + Vector3.up * 1.62f;
        var roverPos = rover != null ? rover.position : astronaut.position + right * 4f;
        Vector3 target;
        switch (view)
        {
            case CloseUp:
                target = head - Vector3.up * .12f;
                position = head + forward * 1.55f + right * .72f - Vector3.up * .08f;
                break;
            case AstronautAndRover:
            {
                var mid = Vector3.Lerp(astronaut.position, roverPos, .45f) + Vector3.up * .95f;
                var across = Vector3.Cross(Vector3.up, (roverPos - astronaut.position).normalized);
                if (Vector3.Dot(across, forward) < 0f) across = -across;
                position = mid + across * 6.4f + (astronaut.position - roverPos).normalized * 1.6f + Vector3.up * .45f;
                target = mid;
                break;
            }
            case Panorama:
            {
                var toVista = Vector3.ProjectOnPlane(panoramaTarget - astronaut.position, Vector3.up).normalized;
                var side = Vector3.Cross(Vector3.up, toVista);
                // Keep the rover out of the lens: frame from the astronaut's far side.
                var roverSide = Mathf.Sign(Vector3.Dot(roverPos - astronaut.position, side));
                position = astronaut.position - toVista * 8f - side * roverSide * 4.5f + Vector3.up * 2.6f;
                target = astronaut.position + toVista * 160f + Vector3.up * 6f;
                break;
            }
            case FinalCinematic:
            {
                position = astronaut.position + forward * 3.3f - right * 1.1f + Vector3.up * .55f;
                target = head - Vector3.up * .35f + (roverPos - astronaut.position) * .12f;
                break;
            }
            default:
                position = head - forward * 4.4f + right * .45f + Vector3.up * .3f;
                target = head + forward * 2f;
                break;
        }
        position = KeepAboveGround(position, view == FinalCinematic ? .35f : .5f);
        rotation = Quaternion.LookRotation(target - position, Vector3.up);
    }

    private static Vector3 KeepAboveGround(Vector3 position, float clearance)
    {
        if (Physics.Raycast(position + Vector3.up * 60f, Vector3.down, out var hit, 120f, ~(1 << 2), QueryTriggerInteraction.Ignore))
            position.y = Mathf.Max(position.y, hit.point.y + clearance);
        return position;
    }
}
