# Unity Mars preview

Open this directory in Unity **6000.3.26f1**. The project uses URP 17.3.0 and glTFast 6.19.0.

Open `Assets/Scenes/RealLook.unity`. To prepare the five-rover archive without replacing the existing scene, run **Echoes → Prepare Five-Rover Showcase (preserve scene)**. To repair legacy particle settings and static rock colliders in an already built scene, run **Echoes → Repair Existing Scene** (also exposed through `Review/Bridge/command.txt` as `repair`). The original **Echoes → Build Real Look Scene** command remains available to regenerate the procedural base scene; it backs up the prior scene before rebuilding.

NASA rover model attributions and the Sojourner reconstruction note are in `Assets/Art/Models/CREDITS.md`.
