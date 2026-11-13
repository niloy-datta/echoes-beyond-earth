using System;
using UnityEngine;
using UnityEngine.InputSystem;

/// <summary>Selection, inspection, comparison and camera controls for the Mars rover gallery.</summary>
public sealed class RoverShowcaseController : MonoBehaviour
{
    [Serializable]
    public sealed class RoverEntry
    {
        public string name;
        public string missionYear;
        public string landingSite;
        [TextArea] public string description;
        public string provenance;
        public GameObject model;
        public InspectionPart[] parts;
    }

    [Serializable]
    public sealed class InspectionPart
    {
        public string name;
        [TextArea] public string description;
        public Vector3 anchor;
    }

    [SerializeField] private RoverEntry[] rovers = Array.Empty<RoverEntry>();
    [SerializeField] private Camera sceneCamera;
    [SerializeField] private Transform astronaut;
    [SerializeField] private CinematicShotDirector shotDirector;
    [SerializeField] private int selectedIndex = 2;
    [SerializeField] private float orbitDistance = 4.6f;
    [SerializeField] private float orbitYaw = 214f;
    [SerializeField] private float orbitPitch = 13f;
    [SerializeField] private float zoomMin = 2f;
    [SerializeField] private float zoomMax = 12f;

    private bool compare;
    private int inspectedPart = -1;
    private Transform marker;
    private Vector3 savedPosition;
    private Quaternion savedRotation;
    private float savedScale;
    private bool savedTransforms;
    private bool showPanel = true;

    public RoverEntry[] Entries => rovers;
    public int SelectedIndex => selectedIndex;
    public Transform SelectedModel => rovers != null && rovers.Length > 0 ? rovers[Mathf.Clamp(selectedIndex, 0, rovers.Length - 1)].model?.transform : null;
    public bool IsComparing => compare;
    public string InspectedPart => inspectedPart >= 0 && Current.parts != null && inspectedPart < Current.parts.Length ? Current.parts[inspectedPart].name : null;
    private RoverEntry Current => rovers[Mathf.Clamp(selectedIndex, 0, rovers.Length - 1)];

    public void Configure(RoverEntry[] entries, Camera camera, Transform explorer, CinematicShotDirector director)
    {
        rovers = entries ?? Array.Empty<RoverEntry>();
        sceneCamera = camera;
        astronaut = explorer;
        shotDirector = director;
        selectedIndex = Mathf.Clamp(selectedIndex, 0, Mathf.Max(0, rovers.Length - 1));
    }

    private void Start()
    {
        if (sceneCamera == null) sceneCamera = Camera.main;
        if (shotDirector == null) shotDirector = GetComponent<CinematicShotDirector>();
        if (rovers == null || rovers.Length == 0) return;
        Select(selectedIndex, false);
        CreateMarker();
    }

    private void OnDestroy()
    {
        if (marker != null) Destroy(marker.gameObject);
        RestoreComparison();
    }

    private void Update()
    {
        if (rovers == null || rovers.Length == 0 || sceneCamera == null) return;
        var keyboard = Keyboard.current;
        if (keyboard != null)
        {
            if (keyboard.tabKey.wasPressedThisFrame) Select((selectedIndex + 1) % rovers.Length, true);
            if (keyboard.rKey.wasPressedThisFrame) ResetCamera();
            if (keyboard.cKey.wasPressedThisFrame) ToggleComparison();
            if (keyboard.iKey.wasPressedThisFrame && Current.parts != null && Current.parts.Length > 0)
                Inspect((inspectedPart + 1) % Current.parts.Length);
            if (keyboard.escapeKey.wasPressedThisFrame && inspectedPart >= 0) ResetCamera();
        }

        var mouse = Mouse.current;
        if (mouse != null)
        {
            if (mouse.rightButton.isPressed && shotDirector != null && !shotDirector.UsesCinematicCamera)
            {
                var delta = mouse.delta.ReadValue();
                orbitYaw += delta.x * .18f;
                orbitPitch = Mathf.Clamp(orbitPitch - delta.y * .14f, -8f, 50f);
            }
            var wheel = mouse.scroll.ReadValue().y;
            if (Mathf.Abs(wheel) > .01f && shotDirector != null && !shotDirector.UsesCinematicCamera)
                orbitDistance = Mathf.Clamp(orbitDistance - wheel * .004f, zoomMin, zoomMax);
        }
    }

    private void LateUpdate()
    {
        if (sceneCamera == null || SelectedModel == null || shotDirector == null || shotDirector.UsesCinematicCamera) return;
        if (compare) { UpdateCompareCamera(); return; }
        var model = SelectedModel;
        var target = inspectedPart >= 0 && Current.parts != null && inspectedPart < Current.parts.Length
            ? model.TransformPoint(Current.parts[inspectedPart].anchor)
            : model.position + Vector3.up * RoverFocusHeight();
        if (marker != null) marker.position = target;
        var rotation = Quaternion.Euler(orbitPitch, orbitYaw, 0f);
        var desired = target + rotation * new Vector3(0f, .15f, -orbitDistance);
        if (Physics.SphereCast(target, .2f, (desired - target).normalized, out var hit, orbitDistance, ~(1 << 2), QueryTriggerInteraction.Ignore))
            desired = target + (desired - target).normalized * Mathf.Max(.8f, hit.distance - .12f);
        var k = 1f - Mathf.Exp(-8f * Time.unscaledDeltaTime);
        sceneCamera.transform.position = Vector3.Lerp(sceneCamera.transform.position, desired, k);
        sceneCamera.transform.rotation = Quaternion.Slerp(sceneCamera.transform.rotation, Quaternion.LookRotation(target - desired), k);
    }

    private float RoverFocusHeight() => selectedIndex == 0 ? .45f : selectedIndex >= 3 ? 1.05f : .72f;

    public void Select(int index, bool transition = true)
    {
        if (rovers == null || rovers.Length == 0) return;
        if (compare) RestoreComparison();
        selectedIndex = Mathf.Clamp(index, 0, rovers.Length - 1);
        inspectedPart = -1;
        for (var i = 0; i < rovers.Length; i++)
            if (rovers[i].model != null) rovers[i].model.SetActive(i == selectedIndex);
        var entry = Current;
        if (marker != null) marker.gameObject.SetActive(true);
        orbitDistance = selectedIndex == 0 ? 2.6f : selectedIndex >= 3 ? 5.3f : 4.2f;
        if (shotDirector != null && shotDirector.ActiveView != CinematicShotDirector.ThirdPerson)
            shotDirector.SetView(CinematicShotDirector.ThirdPerson);
        if (sceneCamera != null && !transition)
        {
            var aim = SelectedModel.position + Vector3.up * RoverFocusHeight();
            sceneCamera.transform.position = aim + Quaternion.Euler(orbitPitch, orbitYaw, 0f) * Vector3.back * orbitDistance;
            sceneCamera.transform.rotation = Quaternion.LookRotation(aim - sceneCamera.transform.position);
        }
        var explorer = GetComponent<RealLookBootstrap>();
        explorer?.SetRover(SelectedModel);
        shotDirector?.SetRover(SelectedModel);
    }

    public void Inspect(int index)
    {
        if (Current.parts == null || index < 0 || index >= Current.parts.Length) return;
        inspectedPart = index;
        orbitDistance = Mathf.Min(orbitDistance, 2.1f);
        if (marker != null) marker.gameObject.SetActive(true);
    }

    public void ResetCamera()
    {
        inspectedPart = -1;
        if (marker != null) marker.gameObject.SetActive(true);
        orbitDistance = selectedIndex == 0 ? 2.6f : selectedIndex >= 3 ? 5.3f : 4.2f;
    }

    public void ToggleComparison()
    {
        if (compare) { RestoreComparison(); return; }
        compare = true;
        savedTransforms = true;
        savedScale = sceneCamera.fieldOfView;
        savedPosition = sceneCamera.transform.position;
        savedRotation = sceneCamera.transform.rotation;
        for (var i = 0; i < rovers.Length; i++)
        {
            var model = rovers[i].model;
            if (model == null) continue;
            model.SetActive(true);
            model.transform.position += Vector3.right * ((i - (rovers.Length - 1) * .5f) * 4.2f);
        }
        if (marker != null) marker.gameObject.SetActive(false);
        FrameComparison();
    }

    private void RestoreComparison()
    {
        if (!compare) return;
        compare = false;
        for (var i = 0; i < rovers.Length; i++)
        {
            var model = rovers[i].model;
            if (model == null) continue;
            model.transform.position -= Vector3.right * ((i - (rovers.Length - 1) * .5f) * 4.2f);
            model.SetActive(i == selectedIndex);
        }
        if (savedTransforms && sceneCamera != null)
        {
            sceneCamera.fieldOfView = savedScale;
            sceneCamera.transform.SetPositionAndRotation(savedPosition, savedRotation);
        }
        savedTransforms = false;
        if (marker != null) marker.gameObject.SetActive(true);
    }

    private void UpdateCompareCamera()
    {
        FrameComparison();
    }

    public void FrameComparison()
    {
        if (sceneCamera == null || SelectedModel == null) return;
        var center = SelectedModel.position;
        var target = center + Vector3.up * .9f;
        var desired = center + Vector3.up * 4.2f - Vector3.forward * 17f;
        sceneCamera.transform.SetPositionAndRotation(desired, Quaternion.LookRotation(target - desired));
        sceneCamera.fieldOfView = 47f;
    }

    private void CreateMarker()
    {
        var go = GameObject.CreatePrimitive(PrimitiveType.Sphere);
        go.name = "Inspection locator";
        go.layer = 2;
        go.transform.localScale = Vector3.one * .055f;
        var collider = go.GetComponent<Collider>();
        if (collider != null) Destroy(collider);
        var renderer = go.GetComponent<Renderer>();
        var shader = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Unlit/Color");
        if (shader != null)
        {
            var material = new Material(shader) { color = new Color(.42f, .86f, .88f, 1f) };
            renderer.sharedMaterial = material;
        }
        marker = go.transform;
    }

    private void OnGUI()
    {
        if (!showPanel || rovers == null || rovers.Length == 0 || RealLookBootstrap.AutomationActive) return;
        var entry = Current;
        var scale = Mathf.Clamp(Screen.width / 1440f, .72f, 1.15f);
        var w = 338f * scale;
        var x = Screen.width - w - 24f * scale;
        var y = Screen.height - 246f * scale;
        var rect = new Rect(x, y, w, 218f * scale);
        DrawPanel(rect, new Color(.024f, .04f, .058f, .94f), new Color(.58f, .34f, .22f, .9f));
        var heading = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(10 * scale), fontStyle = FontStyle.Bold };
        heading.normal.textColor = new Color(.45f, .84f, .86f);
        GUI.Label(new Rect(x + 16 * scale, y + 12 * scale, w - 32 * scale, 16 * scale), "MARS ROVER ARCHIVE  /  SELECT TO EXPLORE", heading);
        var title = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(21 * scale), fontStyle = FontStyle.Bold };
        title.normal.textColor = new Color(.96f, .93f, .87f);
        GUI.Label(new Rect(x + 16 * scale, y + 31 * scale, w - 32 * scale, 29 * scale), entry.name.ToUpperInvariant(), title);
        var body = new GUIStyle(GUI.skin.label) { fontSize = Mathf.RoundToInt(11 * scale), wordWrap = true };
        body.normal.textColor = new Color(.75f, .8f, .81f);
        GUI.Label(new Rect(x + 17 * scale, y + 61 * scale, w - 34 * scale, 31 * scale), entry.missionYear + "   ·   " + entry.landingSite, body);
        GUI.Label(new Rect(x + 17 * scale, y + 88 * scale, w - 34 * scale, 48 * scale), entry.description, body);
        if (!string.IsNullOrEmpty(entry.provenance))
        {
            body.fontSize = Mathf.RoundToInt(9 * scale);
            body.normal.textColor = new Color(.55f, .66f, .68f);
            GUI.Label(new Rect(x + 17 * scale, y + 135 * scale, w - 34 * scale, 20 * scale), entry.provenance, body);
        }

        var buttonsY = y + 160 * scale;
        var buttonStyle = new GUIStyle(GUI.skin.button) { fontSize = Mathf.RoundToInt(11 * scale), fontStyle = FontStyle.Bold };
        buttonStyle.normal.textColor = Color.white;
        var gap = 5f * scale;
        var bw = (w - 32 * scale - gap * 4) / 5;
        for (var i = 0; i < rovers.Length; i++)
        {
            var bx = x + 16 * scale + i * (bw + gap);
            var old = GUI.backgroundColor;
            GUI.backgroundColor = i == selectedIndex ? new Color(.56f, .32f, .2f) : new Color(.12f, .18f, .21f);
            if (GUI.Button(new Rect(bx, buttonsY, bw, 28 * scale), ShortName(i), buttonStyle) && !compare) Select(i, true);
            GUI.backgroundColor = old;
        }
        var actionY = buttonsY + 34 * scale;
        var inspectW = w * .54f;
        if (GUI.Button(new Rect(x + 16 * scale, actionY, inspectW, 23 * scale), InspectedPart == null ? "INSPECT COMPONENT  ·  I" : "RESET CAMERA  ·  R", buttonStyle))
        {
            if (InspectedPart == null && entry.parts != null && entry.parts.Length > 0) Inspect(0);
            else ResetCamera();
        }
        if (GUI.Button(new Rect(x + 22 * scale + inspectW, actionY, w - inspectW - 38 * scale, 23 * scale), compare ? "ROVER HERO" : "COMPARE", buttonStyle)) ToggleComparison();
        if (InspectedPart != null && entry.parts != null && inspectedPart < entry.parts.Length)
        {
            var note = entry.parts[inspectedPart].name + "  ·  " + entry.parts[inspectedPart].description;
            GUI.Label(new Rect(24, Screen.height - 118 * scale, Screen.width * .5f, 58 * scale), note, body);
        }
    }

    private static string ShortName(int index) => new[] { "SOJ", "SPI", "OPP", "CUR", "PER" }[Mathf.Clamp(index, 0, 4)];

    private static void DrawPanel(Rect rect, Color fill, Color edge)
    {
        var old = GUI.color;
        GUI.color = fill;
        GUI.DrawTexture(rect, Texture2D.whiteTexture);
        GUI.color = edge;
        GUI.DrawTexture(new Rect(rect.x, rect.y, rect.width, 1f), Texture2D.whiteTexture);
        GUI.DrawTexture(new Rect(rect.x, rect.y + rect.height - 1f, rect.width, 1f), Texture2D.whiteTexture);
        GUI.DrawTexture(new Rect(rect.x, rect.y, 1f, rect.height), Texture2D.whiteTexture);
        GUI.DrawTexture(new Rect(rect.x + rect.width - 1f, rect.y, 1f, rect.height), Texture2D.whiteTexture);
        GUI.color = old;
    }
}
