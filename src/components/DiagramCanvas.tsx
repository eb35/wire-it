import {
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Point } from "../domain/types";
import { useDiagramStore } from "../store/useDiagramStore";
import { CableEdge, type CableEdgeData } from "./canvas/CableEdge";
import { LocationNode, type LocationNodeData } from "./canvas/LocationNode";
import { NoteNode } from "./canvas/NoteNode";
import { isPaletteKind } from "./Palette";

const nodeTypes = { location: LocationNode, note: NoteNode };
const edgeTypes = { cable: CableEdge };

function toNodes(
  locations: { id: string; kind: LocationNodeData["kind"]; label: string; device: LocationNodeData["device"]; position: Point }[],
  notes: { id: string; text: string; position: Point }[],
  selection: { kind: string; id: string } | null,
): Node[] {
  return [
    ...locations.map((location) => ({
      id: location.id,
      type: "location" as const,
      position: location.position,
      selected: selection?.kind === "location" && selection.id === location.id,
      data: {
        kind: location.kind,
        label: location.label,
        device: location.device,
      },
    })),
    ...notes.map((note) => ({
      id: note.id,
      type: "note" as const,
      position: note.position,
      selected: selection?.kind === "note" && selection.id === note.id,
      data: { text: note.text },
    })),
  ];
}

function DiagramCanvasInner() {
  const project = useDiagramStore((state) => state.project);
  const selection = useDiagramStore((state) => state.selection);
  const connectType = useDiagramStore((state) => state.connectType);
  const connectFrom = useDiagramStore((state) => state.connectFrom);
  const moveNode = useDiagramStore((state) => state.moveNode);
  const addLocation = useDiagramStore((state) => state.addLocation);
  const addNote = useDiagramStore((state) => state.addNote);
  const setSelection = useDiagramStore((state) => state.setSelection);
  const deleteSelection = useDiagramStore((state) => state.deleteSelection);
  const cancelConnect = useDiagramStore((state) => state.cancelConnect);
  const addBend = useDiagramStore((state) => state.addBend);
  const { screenToFlowPosition } = useReactFlow();

  const derivedNodes = useMemo(
    () => toNodes(project.locations, project.notes, selection),
    [project.locations, project.notes, selection],
  );
  const [nodes, setNodes] = useState<Node[]>(derivedNodes);

  useEffect(() => {
    setNodes(derivedNodes);
  }, [derivedNodes]);

  const edges = useMemo<Edge<CableEdgeData>[]>(
    () =>
      project.cables.map((cable) => ({
        id: cable.id,
        type: "cable",
        source: cable.source,
        target: cable.target,
        sourceHandle: cable.sourceHandle,
        targetHandle: cable.targetHandle,
        selected: selection?.kind === "cable" && selection.id === cable.id,
        data: {
          type: cable.type,
          label: cable.label,
          color: cable.color,
          waypoints: cable.waypoints,
        },
      })),
    [project.cables, selection],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  return (
    <div
      className="relative min-h-0 min-w-0 flex-1"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const kind = event.dataTransfer.getData("application/wire-it");
        if (!isPaletteKind(kind)) return;
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        if (kind === "note") addNote(position);
        else addLocation(kind, position);
      }}
    >
      {connectType ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded border border-sky-700 bg-zinc-950/90 px-2 py-1 text-xs text-sky-300">
          {connectFrom
            ? `Click another box to finish the ${connectType} run — Esc to cancel`
            : `Click a box to start a ${connectType} run — Esc to cancel`}
        </div>
      ) : null}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={(_event, node) => moveNode(node.id, node.position)}
        onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
          if (selectedEdges.length === 1 && selectedEdges[0]) {
            setSelection({ kind: "cable", id: selectedEdges[0].id });
            return;
          }
          if (selectedNodes.length === 1 && selectedNodes[0]) {
            const node = selectedNodes[0];
            setSelection({
              kind: node.type === "note" ? "note" : "location",
              id: node.id,
            });
            return;
          }
          if (selectedNodes.length === 0 && selectedEdges.length === 0) {
            setSelection(null);
          }
        }}
        onEdgeDoubleClick={(event, edge) => {
          const cable = project.cables.find((item) => item.id === edge.id);
          if (!cable) return;
          const source = project.locations.find((item) => item.id === cable.source);
          const target = project.locations.find((item) => item.id === cable.target);
          if (!source || !target) return;
          const point = screenToFlowPosition({ x: event.clientX, y: event.clientY });
          addBend(
            edge.id,
            point,
            { x: source.position.x + 74, y: source.position.y + 40 },
            { x: target.position.x + 74, y: target.position.y + 40 },
          );
        }}
        onPaneClick={() => {
          if (connectType) return;
          setSelection(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") cancelConnect();
          if (event.key === "Delete" || event.key === "Backspace") {
            const target = event.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
            event.preventDefault();
            deleteSelection();
          }
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={null}
        className="h-full w-full"
      >
        <Background gap={20} color="#27272a" />
        <Controls />
        <MiniMap pannable zoomable maskColor="rgba(9,9,11,0.7)" nodeColor="#3f3f46" />
      </ReactFlow>
    </div>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner />
    </ReactFlowProvider>
  );
}
