/**
 * FileExplorer.tsx
 * Explorateur de fichiers multi-niveaux style Bolt.new / VS Code.
 * Construit une arborescence à partir d'un Record<string, string> (chemin → contenu).
 */
import { useState } from 'react';
import { ChevronRight, ChevronDown, FileCode2, FileJson, FileText, Folder, FolderOpen } from 'lucide-react';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children: Record<string, FileNode>;
  content?: string;
}

function buildTree(files: Record<string, string>): FileNode {
  const root: FileNode = { name: '', path: '', type: 'dir', children: {} };

  for (const [path, content] of Object.entries(files)) {
    const parts = path.split('/');
    let current = root;
    let builtPath = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      builtPath = builtPath ? `${builtPath}/${part}` : part;

      if (i === parts.length - 1) {
        current.children[part] = {
          name: part,
          path: builtPath,
          type: 'file',
          children: {},
          content,
        };
      } else {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: builtPath,
            type: 'dir',
            children: {},
          };
        }
        current = current.children[part];
      }
    }
  }

  return root;
}

function getFileIcon(name: string) {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode2 size={14} className="text-blue-400 shrink-0" />;
  if (name.endsWith('.json')) return <FileJson size={14} className="text-yellow-400 shrink-0" />;
  if (name.endsWith('.css') || name.endsWith('.scss')) return <FileText size={14} className="text-pink-400 shrink-0" />;
  if (name.endsWith('.jsx') || name.endsWith('.js')) return <FileCode2 size={14} className="text-yellow-300 shrink-0" />;
  if (name.endsWith('.html')) return <FileCode2 size={14} className="text-orange-400 shrink-0" />;
  return <FileText size={14} className="text-ink-400 shrink-0" />;
}

interface TreeNodeProps {
  node: FileNode;
  depth?: number;
  selectedPath: string | null;
  onSelect: (path: string, content: string) => void;
}

function TreeNode({ node, depth = 0, selectedPath, onSelect }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2);

  if (node.type === 'file') {
    const isSelected = selectedPath === node.path;
    return (
      <button
        onClick={() => onSelect(node.path, node.content ?? '')}
        className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors text-left ${
          isSelected
            ? 'bg-white/10 text-white'
            : 'text-ink-300 hover:bg-white/5 hover:text-white'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {getFileIcon(node.name)}
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const sortedChildren = Object.values(node.children).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs text-ink-300 hover:bg-white/5 hover:text-white transition-colors"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {open ? (
          <ChevronDown size={12} className="shrink-0 text-ink-500" />
        ) : (
          <ChevronRight size={12} className="shrink-0 text-ink-500" />
        )}
        {open ? (
          <FolderOpen size={14} className="shrink-0 text-yellow-300" />
        ) : (
          <Folder size={14} className="shrink-0 text-yellow-300" />
        )}
        <span className="font-medium truncate">{node.name}</span>
      </button>
      {open && (
        <div>
          {sortedChildren.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileExplorerProps {
  files: Record<string, string>;
  selectedPath: string | null;
  onSelect: (path: string, content: string) => void;
  projectName?: string;
}

export function FileExplorer({ files, selectedPath, onSelect, projectName }: FileExplorerProps) {
  const tree = buildTree(files);
  const rootChildren = Object.values(tree.children).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="px-3 py-2.5 border-b border-white/5 flex items-center gap-2">
        <FolderOpen size={14} className="text-electric-400 shrink-0" />
        <span className="text-xs font-semibold text-ink-200 truncate">
          {projectName || 'Mon Projet'}
        </span>
        <span className="ml-auto text-[10px] text-ink-500">
          {Object.keys(files).length} fichiers
        </span>
      </div>
      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {rootChildren.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
