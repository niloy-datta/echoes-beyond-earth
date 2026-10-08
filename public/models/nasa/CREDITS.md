# NASA 3D models used in the Mission Stories

These models come from **NASA 3D Resources** (https://github.com/nasa/NASA-3D-Resources, commit `11ebb4ee`), which NASA
describes as "free and without copyright". Use is subject to NASA's media usage guidelines
(https://www.nasa.gov/nasa-brand-center/images-and-media): they may not be used to imply NASA endorsement.
The geometry, node names and materials are NASA's; the files were only re-compressed to keep the download small (Draco mesh compression, WebP textures, textures capped at 1024 px) with `gltf-transform`. Originals: see the repository above.

| File here | NASA 3D Resources folder | Used for |
| --- | --- | --- |
| `apollo-lm.glb` | Apollo Lunar Module | Apollo 11 / Apollo 17 chapters, VR park |
| `viking-lander.glb` | Viking Lander | Viking 1 chapter, VR park |
| `insight.glb` | InSight Cruise Lander (arm deployed) | InSight chapter, VR park |
| `perseverance.glb` | Mars 2020 Perseverance Rover | rover beside Ingenuity |
| `ingenuity.glb` | Ingenuity Mars Helicopter | Ingenuity chapter, VR park |
| `lro.glb` | Lunar Reconnaissance Orbiter (A) | the "echo" scene of Moon chapters |
| `mro.glb` | Mars Reconnaissance Orbiter (MRO) (B) | the "echo" scene of Mars chapters |

`../opportunity-mer-b.glb` (Opportunity) is the NASA model already shipped with this project.

Not available from NASA 3D Resources (checked against the full folder list), so drawn in code as simplified original
models: Surveyor 3, Intuitive Machines Nova-C (IM-1 Odysseus), Mars Pathfinder + Sojourner, Phoenix and the Lunar Roving
Vehicle.
