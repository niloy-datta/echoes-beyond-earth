using UnityEngine;

/// <summary>
/// Lightweight cinematic-preview controls for RealLook. The full five-chapter
/// game remains in the browser implementation; this scene is not a duplicate
/// mission system.
/// </summary>
public sealed class RealLookBootstrap : MonoBehaviour
{
    [SerializeField] private Transform explorer;
    [SerializeField] private Transform rover;
    [SerializeField] private float walkSpeed = 3.1f;
    [SerializeField] private float runSpeed = 5.6f;
    [SerializeField] private float mouseSensitivity = 2.2f;

    private Camera sceneCamera;
    private CharacterController controller;
    private float yaw;
    private float pitch = 14f;
    private float verticalVelocity;
    private bool paused;

    private void Start()
    {
        explorer = explorer ?? GameObject.Find("Astronaut")?.transform;
        rover = rover ?? GameObject.Find("Scout Rover")?.transform;
        sceneCamera = Camera.main;
        controller = explorer != null ? explorer.GetComponent<CharacterController>() : null;
        if (sceneCamera == null || explorer == null) return;

        yaw = explorer.eulerAngles.y + 35f;
        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
        UpdateCamera(true);
    }

    private void Update()
    {
        if (Input.GetKeyDown(KeyCode.Escape)) TogglePause();
        if (paused || sceneCamera == null || explorer == null) return;

        RotateCamera();
        MoveExplorer();
        if (Input.GetKeyDown(KeyCode.E)) Interact();
        UpdateCamera(false);
    }

    private void RotateCamera()
    {
        yaw += Input.GetAxis("Mouse X") * mouseSensitivity;
        pitch = Mathf.Clamp(pitch - Input.GetAxis("Mouse Y") * mouseSensitivity, -8f, 48f);
    }

    private void MoveExplorer()
    {
        var viewForward = Vector3.ProjectOnPlane(sceneCamera.transform.forward, Vector3.up).normalized;
        var viewRight = Vector3.ProjectOnPlane(sceneCamera.transform.right, Vector3.up).normalized;
        var input = new Vector3(Input.GetAxisRaw("Horizontal"), 0f, Input.GetAxisRaw("Vertical"));
        var move = viewRight * input.x + viewForward * input.z;
        if (move.sqrMagnitude > 1f) move.Normalize();

        if (move.sqrMagnitude > .001f)
            explorer.rotation = Quaternion.Slerp(explorer.rotation, Quaternion.LookRotation(move), Time.deltaTime * 9f);

        if (controller == null)
        {
            explorer.position += move * walkSpeed * Time.deltaTime;
            return;
        }

        if (controller.isGrounded && verticalVelocity < 0f) verticalVelocity = -1.5f;
        if (controller.isGrounded && Input.GetKeyDown(KeyCode.Space)) verticalVelocity = 4.8f;
        verticalVelocity += Physics.gravity.y * Time.deltaTime;
        var speed = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift) ? runSpeed : walkSpeed;
        controller.Move((move * speed + Vector3.up * verticalVelocity) * Time.deltaTime);
    }

    private void Interact()
    {
        if (rover == null) return;
        var distance = Vector3.Distance(explorer.position, rover.position);
        Debug.Log(distance <= 4.5f
            ? "Scout Rover telemetry link established."
            : "Move closer to the Scout Rover to interact.");
    }

    private void TogglePause()
    {
        paused = !paused;
        Time.timeScale = paused ? 0f : 1f;
        Cursor.lockState = paused ? CursorLockMode.None : CursorLockMode.Locked;
        Cursor.visible = paused;
        Debug.Log(paused ? "Cinematic preview paused." : "Cinematic preview resumed.");
    }

    private void UpdateCamera(bool instant)
    {
        var rotation = Quaternion.Euler(pitch, yaw, 0f);
        var target = explorer.position + Vector3.up * 1.55f;
        var desired = target + rotation * new Vector3(0f, .38f, -6.3f);
        sceneCamera.transform.position = instant
            ? desired
            : Vector3.Lerp(sceneCamera.transform.position, desired, 1f - Mathf.Exp(-10f * Time.deltaTime));
        sceneCamera.transform.rotation = Quaternion.LookRotation(target - sceneCamera.transform.position, Vector3.up);
    }
}
