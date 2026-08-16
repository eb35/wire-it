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
  locations: {
    id: string;
    kind: LocationNodeData["kind"];
    label: string;
    device: LocationNodeData["device"];
    position: Point;
  }[],
  notes: { id: string; text: string; position: Point }[],
): Node[] {
  return [
    ...locations.map((location) => ({
      id: location.id,
      type: "location" as const,
      position: location.position,
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
      data: { text: note.text },
    })),
  ];
}

function DiagramCanvasInner() {
  const project = useDiagramStore((state) => state.project);
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

  const [nodes, setNodes] = useState<Node[]>(() =>
    toNodes(project.locations, project.notes),
  );

  useEffect(() => {
    const selectedId = useDiagramStore.getState().selection?.id;
    setNodes((current) => {
      const previous = new Map(current.map((node) => [node.id, node]));
      return toNodes(project.locations, project.notes).map((node) => {
        const prior = previous.get(node.id);
        return {
          ...node,
          selected: Boolean(prior?.selected || node.id === selectedId),
          position:
            prior && "dragging" in prior && prior.dragging
              ? prior.position
              : node.position,
        };
      });
    });
  }, [project.id, project.locations, project.notes]);

  const edges = useMemo<Edge<CableEdgeData>[]>(
    () =>
      project.cables.map((cable) => ({
        id: cable.id,
        type: "cable",
        source: cable.source,
        target: cable.target,
        sourceHandle: cable.sourceHandle,
        targetHandle: cable.targetHandle,
        data: {
          type: cable.type,
          label: cable.label,
          color: cable.color,
          waypoints: cable.waypoints,
        },
      })),
    [project.cables],
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
        onNodeClick={(_event, node) => {
          setSelection({
            kind: node.type === "note" ? "note" : "location",
            id: node.id,
          });
        }}
        onEdgeClick={(_event, edge) => {
          setSelection({ kind: "cable", id: edge.id });
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
