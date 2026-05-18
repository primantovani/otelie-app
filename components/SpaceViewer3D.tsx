'use client'
import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import * as THREE from 'three'

export type SpaceViewer3DHandle = {
  capture: () => { perspective: string; topDown: string }
}

interface Props {
  comprimento?: number
  largura?: number
  area: number
  alturaPeDireito?: number
  peDireito: string
  plantaForma: string
  janelasPos: string
  entradaPos: string
  fachada: string
  elementosFixos: string[]
  pisoTipo: string
  paredeTipo: string
  tetoTipo: string
}

// ─── color maps ───────────────────────────────────────────────────────────────

const FLOOR_COLOR: Record<string, number> = {
  'cimento-queimado': 0x8c8c8c,
  'ceramica': 0xddd0b8,
  'madeira': 0xb87c4a,
  'vinilico': 0xa89880,
  'pedra': 0x909090,
  'outro': 0xaaaaaa,
}

const WALL_COLOR: Record<string, number> = {
  'reboco-pintado': 0xf0ece0,
  'tijolo-aparente': 0xb06040,
  'azulejo': 0xdce8f0,
  'drywall': 0xfafafa,
  'outro': 0xeeeeee,
}

const CEILING_COLOR: Record<string, number> = {
  'laje-aparente': 0xaaaaaa,
  'forro-gesso': 0xfafafa,
  'forro-madeira': 0xcc9a60,
  'steel-deck': 0x8898a8,
  'outro': 0xf0f0f0,
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDimensions(props: Props): { w: number; l: number; h: number } {
  // width = largura (cross), length = comprimento (depth)
  let w: number, l: number
  if (props.comprimento && props.largura) {
    w = props.largura
    l = props.comprimento
  } else {
    const ratios: Record<string, number> = {
      corredor: 0.30,
      quadrado: 1.00,
      retangular: 0.65,
      'formato-l': 0.65,
      irregular: 0.72,
    }
    const r = ratios[props.plantaForma] ?? 0.65
    l = Math.sqrt(props.area / r)
    w = props.area / l
  }

  const h = props.alturaPeDireito ?? (
    props.peDireito === 'alto' ? 13 : props.peDireito === 'baixo' ? 7.5 : 9.5
  )

  // scale down for scene (1 scene unit = 2 ft)
  return { w: w / 2, l: l / 2, h: h / 2 }
}

function buildScene(props: Props): THREE.Scene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  const { w, l, h } = getDimensions(props)

  // lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dir = new THREE.DirectionalLight(0xffeedd, 1.0)
  dir.position.set(w, h * 2, l)
  scene.add(dir)
  const hem = new THREE.HemisphereLight(0xddeeff, 0x442200, 0.4)
  scene.add(hem)

  const floorCol = FLOOR_COLOR[props.pisoTipo] ?? 0xaaaaaa
  const wallCol = WALL_COLOR[props.paredeTipo] ?? 0xf0ece0
  const ceilCol = CEILING_COLOR[props.tetoTipo] ?? 0xfafafa
  const windowCol = 0x88c8f0
  const doorCol = 0x7a5c3a

  const floorMat = new THREE.MeshLambertMaterial({ color: floorCol, side: THREE.DoubleSide })
  const wallMat = new THREE.MeshLambertMaterial({ color: wallCol, side: THREE.DoubleSide })
  const ceilMat = new THREE.MeshLambertMaterial({ color: ceilCol, side: THREE.DoubleSide })
  const winMat = new THREE.MeshBasicMaterial({ color: windowCol, transparent: true, opacity: 0.65 })
  const doorMat = new THREE.MeshLambertMaterial({ color: doorCol })

  // ── floor ──
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, l), floorMat)
  floor.rotation.x = -Math.PI / 2
  scene.add(floor)

  // ── ceiling ──
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, l), ceilMat)
  ceil.rotation.x = Math.PI / 2
  ceil.position.y = h
  scene.add(ceil)

  // ── walls (north, south, east, west) ──
  // south = front (z = +l/2), north = back (z = -l/2)
  // east = right (x = +w/2), west = left (x = -w/2)

  function addWall(pw: number, ph: number, pos: THREE.Vector3, ry: number) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), wallMat)
    m.position.copy(pos)
    m.rotation.y = ry
    scene.add(m)
  }

  const yMid = h / 2
  addWall(w, h, new THREE.Vector3(0, yMid, -l / 2), 0)          // north
  addWall(w, h, new THREE.Vector3(0, yMid, l / 2), Math.PI)      // south
  addWall(l, h, new THREE.Vector3(w / 2, yMid, 0), -Math.PI / 2) // east
  addWall(l, h, new THREE.Vector3(-w / 2, yMid, 0), Math.PI / 2) // west

  // ── windows ──
  const winW = Math.min(w * 0.55, 4)
  const winH = Math.min(h * 0.4, 2)
  const winY = h * 0.62

  function addWindow(pos: THREE.Vector3, ry: number) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(winW, winH), winMat)
    win.position.copy(pos)
    win.rotation.y = ry
    scene.add(win)
  }

  const eps = 0.02
  const jp = props.janelasPos
  if (jp === 'so-frente' || jp === 'frente-lateral') {
    addWindow(new THREE.Vector3(0, winY, l / 2 + eps), Math.PI) // south
  }
  if (jp === 'frente-lateral') {
    addWindow(new THREE.Vector3(w / 2 + eps, winY, 0), -Math.PI / 2) // east
  }
  if (jp === 'so-lateral') {
    addWindow(new THREE.Vector3(w / 2 + eps, winY, 0), -Math.PI / 2)
  }

  // ── door ──
  const dw = Math.min(w * 0.2, 1.5)
  const dh = Math.min(h * 0.75, 3.5)
  const door = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), doorMat)
  door.position.y = dh / 2

  const ep = props.entradaPos
  if (ep === 'frente') {
    door.position.z = l / 2 + eps
    door.rotation.y = Math.PI
  } else if (ep === 'fundo') {
    door.position.z = -l / 2 - eps
  } else if (ep === 'lateral-dir') {
    door.position.x = w / 2 + eps
    door.rotation.y = -Math.PI / 2
  } else {
    door.position.x = -w / 2 - eps
    door.rotation.y = Math.PI / 2
  }
  scene.add(door)

  // ── columns ──
  if (props.elementosFixos.includes('pilares')) {
    const colGeo = new THREE.CylinderGeometry(0.25, 0.25, h, 8)
    const colMat = new THREE.MeshLambertMaterial({ color: 0xd0c8c0 })
    const positions = [
      [-w * 0.3, 0, -l * 0.3],
      [w * 0.3, 0, -l * 0.3],
    ]
    for (const [cx, , cz] of positions) {
      const col = new THREE.Mesh(colGeo, colMat)
      col.position.set(cx, h / 2, cz)
      scene.add(col)
    }
  }

  // ── mezzanine ──
  if (props.elementosFixos.includes('mezanino')) {
    const mezGeo = new THREE.BoxGeometry(w * 0.45, 0.1, l * 0.4)
    const mezMat = new THREE.MeshLambertMaterial({ color: floorCol })
    const mez = new THREE.Mesh(mezGeo, mezMat)
    mez.position.set(w * 0.25, h * 0.55, -l * 0.25)
    scene.add(mez)
  }

  // ── L-shape extension hint ──
  if (props.plantaForma === 'formato-l') {
    const ext = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.4, l * 0.35),
      new THREE.MeshLambertMaterial({ color: floorCol, side: THREE.DoubleSide })
    )
    ext.rotation.x = -Math.PI / 2
    ext.position.set(w * 0.65, 0.01, -l * 0.15)
    scene.add(ext)

    const extWall = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.4, h),
      wallMat.clone()
    )
    extWall.position.set(w * 0.65, h / 2, -l * 0.33)
    scene.add(extWall)

    const extWall2 = new THREE.Mesh(
      new THREE.PlaneGeometry(l * 0.35, h),
      wallMat.clone()
    )
    extWall2.rotation.y = Math.PI / 2
    extWall2.position.set(w * 0.85, h / 2, -l * 0.155)
    scene.add(extWall2)
  }

  // ── floor grid overlay ──
  const grid = new THREE.GridHelper(Math.max(w, l) * 1.5, 20, 0x444466, 0x333355)
  grid.position.y = -0.01
  scene.add(grid)

  return scene
}

// ─── component ────────────────────────────────────────────────────────────────

const SpaceViewer3D = forwardRef<SpaceViewer3DHandle, Props>(function SpaceViewer3D(props, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const frameRef = useRef<number>(0)
  const isDragging = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })
  const camAngle = useRef({ theta: -0.6, phi: 0.9 })
  const camRadius = useRef(0)

  const rebuild = useCallback(() => {
    if (!sceneRef.current) return
    // dispose old scene children
    sceneRef.current.children.forEach(c => {
      if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose()
    })
    const newScene = buildScene(props)
    sceneRef.current.copy(newScene, true)
    // reset children
    while (sceneRef.current.children.length > 0) sceneRef.current.remove(sceneRef.current.children[0])
    newScene.children.forEach(c => sceneRef.current!.add(c))
    sceneRef.current.background = newScene.background
  }, [props])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const w = el.clientWidth
    const h = el.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = buildScene(props)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500)
    cameraRef.current = camera

    const { w: rw, l: rl, h: rh } = getDimensions(props)
    camRadius.current = Math.max(rw, rl) * 1.8 + rh

    function updateCamera() {
      if (!cameraRef.current) return
      const r = camRadius.current
      const { theta, phi } = camAngle.current
      cameraRef.current.position.set(
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.cos(theta)
      )
      const target = new THREE.Vector3(0, getDimensions(props).h / 2, 0)
      cameraRef.current.lookAt(target)
    }
    updateCamera()

    function animate() {
      frameRef.current = requestAnimationFrame(animate)
      renderer.render(sceneRef.current!, cameraRef.current!)
    }
    animate()

    // mouse drag orbit
    function onDown(e: MouseEvent) {
      isDragging.current = true
      lastMouse.current = { x: e.clientX, y: e.clientY }
    }
    function onMove(e: MouseEvent) {
      if (!isDragging.current) return
      const dx = e.clientX - lastMouse.current.x
      const dy = e.clientY - lastMouse.current.y
      camAngle.current.theta -= dx * 0.01
      camAngle.current.phi = Math.max(0.2, Math.min(1.4, camAngle.current.phi + dy * 0.01))
      lastMouse.current = { x: e.clientX, y: e.clientY }
      updateCamera()
    }
    function onUp() { isDragging.current = false }
    function onWheel(e: WheelEvent) {
      camRadius.current = Math.max(3, camRadius.current + e.deltaY * 0.05)
      updateCamera()
    }

    renderer.domElement.addEventListener('mousedown', onDown)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      cancelAnimationFrame(frameRef.current)
      renderer.domElement.removeEventListener('mousedown', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // rebuild scene when props change
  useEffect(() => {
    rebuild()
  }, [rebuild])

  useImperativeHandle(ref, () => ({
    capture() {
      const renderer = rendererRef.current!
      const scene = sceneRef.current!
      const { w, l, h } = getDimensions(props)
      const origW = renderer.domElement.width
      const origH = renderer.domElement.height

      // capture at fixed resolution
      renderer.setSize(1024, 640)
      const cam = new THREE.PerspectiveCamera(55, 1024 / 640, 0.1, 500)
      const target = new THREE.Vector3(0, h / 2, 0)

      // view 1: perspective (front-right corner)
      cam.position.set(w * 1.2, h * 1.0, l * 1.2)
      cam.lookAt(target)
      renderer.render(scene, cam)
      const perspective = renderer.domElement.toDataURL('image/jpeg', 0.92)

      // view 2: top-down
      renderer.setSize(1024, 1024)
      const camTop = new THREE.PerspectiveCamera(55, 1, 0.1, 500)
      camTop.position.set(0, Math.max(w, l) * 1.8, 0)
      camTop.lookAt(0, 0, 0)
      renderer.render(scene, camTop)
      const topDown = renderer.domElement.toDataURL('image/jpeg', 0.92)

      // restore
      renderer.setSize(origW / window.devicePixelRatio, origH / window.devicePixelRatio)
      renderer.render(scene, cameraRef.current!)

      return { perspective, topDown }
    },
  }), [props])

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ height: 280 }}>
      <div ref={containerRef} className="w-full h-full" />
      <span className="absolute bottom-2 right-2 text-[10px] text-white/40 select-none pointer-events-none">
        drag to orbit · scroll to zoom
      </span>
    </div>
  )
})

export default SpaceViewer3D
