// Thin authoring layer over glTF-Transform: three.js geometry in, optimised
// GLB out (skins, morph targets, animation clips, PBR materials, WebP
// textures, meshopt-compressed geometry).
import { Document, NodeIO } from "@gltf-transform/core";
import {
  ALL_EXTENSIONS, KHRMaterialsClearcoat, KHRMaterialsEmissiveStrength, KHRMaterialsSheen,
} from "@gltf-transform/extensions";
import { dedup, meshopt, prune, resample, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

export class GlbBuilder {
  constructor(name) {
    this.doc = new Document();
    this.doc.getRoot().getAsset().generator = "Echoes Beyond Earth procedural asset pipeline";
    this.buffer = this.doc.createBuffer();
    this.scene = this.doc.createScene(name);
    this.clearcoat = this.doc.createExtension(KHRMaterialsClearcoat);
    this.sheen = this.doc.createExtension(KHRMaterialsSheen);
    this.emissive = this.doc.createExtension(KHRMaterialsEmissiveStrength);
    this.textures = new Map();
  }

  texture(key, png) {
    if (!png) return null;
    if (!this.textures.has(key)) this.textures.set(key, this.doc.createTexture(key).setImage(png).setMimeType("image/png"));
    return this.textures.get(key);
  }

  /**
   * opts: color [r,g,b,a], metallic, roughness, emissive [r,g,b], emissiveStrength,
   * maps { base, normal, orm } (PNG buffers), clearcoat, sheen [r,g,b], doubleSided, alpha.
   */
  material(name, o = {}) {
    const m = this.doc.createMaterial(name)
      .setBaseColorFactor(o.color ?? [1, 1, 1, 1])
      .setMetallicFactor(o.metallic ?? 0)
      .setRoughnessFactor(o.roughness ?? 0.8)
      .setDoubleSided(!!o.doubleSided);
    if (o.alpha) m.setAlphaMode("BLEND");
    if (o.emissive) {
      m.setEmissiveFactor(o.emissive);
      if (o.emissiveStrength) m.setExtension("KHR_materials_emissive_strength", this.emissive.createEmissiveStrength().setEmissiveStrength(o.emissiveStrength));
    }
    if (o.maps?.base) m.setBaseColorTexture(this.texture(`${o.mapKey}-base`, o.maps.base));
    if (o.maps?.normal) { m.setNormalTexture(this.texture(`${o.mapKey}-normal`, o.maps.normal)); m.getNormalTextureInfo().setTexCoord(0); m.setNormalScale(o.normalScale ?? 1); }
    if (o.maps?.orm) {
      const t = this.texture(`${o.mapKey}-orm`, o.maps.orm);
      m.setMetallicRoughnessTexture(t);
      m.setOcclusionTexture(t);
      m.setOcclusionStrength(o.aoStrength ?? 0.8);
    }
    if (o.clearcoat) m.setExtension("KHR_materials_clearcoat", this.clearcoat.createClearcoat().setClearcoatFactor(o.clearcoat).setClearcoatRoughnessFactor(o.clearcoatRoughness ?? 0.15));
    if (o.sheen) m.setExtension("KHR_materials_sheen", this.sheen.createSheen().setSheenColorFactor(o.sheen).setSheenRoughnessFactor(0.6));
    return m;
  }

  node(name, { translation = [0, 0, 0], rotation = [0, 0, 0, 1], scale = [1, 1, 1], parent = null } = {}) {
    const n = this.doc.createNode(name).setTranslation(translation).setRotation(rotation).setScale(scale);
    if (parent) parent.addChild(n); else this.scene.addChild(n);
    return n;
  }

  accessor(array, type) {
    return this.doc.createAccessor().setArray(array).setType(type).setBuffer(this.buffer);
  }

  /**
   * geo: three.js BufferGeometry (non-indexed or indexed). extra: { joints, weights,
   * color (Float32 RGBA per vertex), targets: [{ name, position, normal }] }.
   */
  primitive(geo, material, extra = {}) {
    const p = this.doc.createPrimitive().setMaterial(material);
    p.setAttribute("POSITION", this.accessor(new Float32Array(geo.attributes.position.array), "VEC3"));
    if (geo.attributes.normal) p.setAttribute("NORMAL", this.accessor(new Float32Array(geo.attributes.normal.array), "VEC3"));
    if (geo.attributes.uv) p.setAttribute("TEXCOORD_0", this.accessor(new Float32Array(geo.attributes.uv.array), "VEC2"));
    if (extra.color) p.setAttribute("COLOR_0", this.accessor(extra.color, "VEC4"));
    if (extra.joints) {
      p.setAttribute("JOINTS_0", this.accessor(extra.joints, "VEC4"));
      p.setAttribute("WEIGHTS_0", this.accessor(extra.weights, "VEC4"));
    }
    if (geo.index) {
      const idx = geo.index.array;
      p.setIndices(this.accessor(idx.length > 65535 || geo.attributes.position.count > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), "SCALAR"));
    }
    for (const t of extra.targets ?? []) {
      const target = this.doc.createPrimitiveTarget(t.name);
      target.setAttribute("POSITION", this.accessor(t.position, "VEC3"));
      if (t.normal) target.setAttribute("NORMAL", this.accessor(t.normal, "VEC3"));
      p.addTarget(target);
    }
    return p;
  }

  mesh(name, primitives, node, { targetNames } = {}) {
    const m = this.doc.createMesh(name);
    for (const p of primitives) m.addPrimitive(p);
    if (targetNames) m.setExtras({ targetNames });
    if (targetNames) m.setWeights(targetNames.map(() => 0));
    node.setMesh(m);
    return m;
  }

  skin(name, joints, inverseBind, root) {
    const s = this.doc.createSkin(name).setInverseBindMatrices(this.accessor(inverseBind, "MAT4"));
    for (const j of joints) s.addJoint(j);
    if (root) s.setSkeleton(root);
    return s;
  }

  /** channels: [{ node, path: 'rotation'|'translation'|'scale'|'weights', times: Float32Array, values: Float32Array }] */
  animation(name, channels) {
    const a = this.doc.createAnimation(name);
    for (const c of channels) {
      const sampler = this.doc.createAnimationSampler()
        .setInput(this.accessor(c.times, "SCALAR"))
        .setOutput(this.accessor(c.values, c.path === "rotation" ? "VEC4" : c.path === "weights" ? "SCALAR" : "VEC3"))
        .setInterpolation("LINEAR");
      a.addSampler(sampler);
      a.addChannel(this.doc.createAnimationChannel().setTargetNode(c.node).setTargetPath(c.path).setSampler(sampler));
    }
    return a;
  }

  /** Optimise and write: dedup, WebP textures at `textureSize`, meshopt geometry. */
  async write(path, { textureSize = 1024 } = {}) {
    await MeshoptEncoder.ready;
    await this.doc.transform(
      dedup(),
      weld(),
      resample({ tolerance: 1e-4 }),
      prune({ keepAttributes: true, keepLeaves: true }),
      textureCompress({ encoder: sharp, targetFormat: "webp", resize: [textureSize, textureSize], quality: 84 }),
      meshopt({ encoder: MeshoptEncoder, level: "medium" }),
    );
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder, "meshopt.decoder": MeshoptDecoder });
    await io.write(path, this.doc);
  }
}
