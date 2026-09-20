import React from 'react';
import { LayoutTemplate, Sparkles, X, ArrowRight } from 'lucide-react';
import { DIAGRAM_TEMPLATES } from '../../engine/templates';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCollabStore } from '../../stores/useCollabStore';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({ isOpen, onClose }) => {
  const { loadTemplateElements, setBoardTitle } = useCanvasStore();
  const { sendElementsChange } = useCollabStore();

  if (!isOpen) return null;

  const handleSelectTemplate = (tpl: (typeof DIAGRAM_TEMPLATES)[0]) => {
    loadTemplateElements(tpl.elements);
    sendElementsChange(tpl.elements, true);
    setBoardTitle(tpl.title);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-2xl bg-white dark:bg-canvas-cardDark border border-slate-200 dark:border-canvas-borderDark rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-aura-600 to-indigo-500 flex items-center justify-center text-white shadow-glow">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Diagram Templates Library
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose a ready-to-use template to jumpstart your brainstorming
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gallery */}
        <div className="py-5 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {DIAGRAM_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => handleSelectTemplate(tpl)}
              className="group relative rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-aura-500 dark:hover:border-aura-500 p-4 cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-aura-100 dark:bg-aura-950/60 text-aura-600 dark:text-aura-400">
                    {tpl.category}
                  </span>
                  <span className="text-xs text-slate-400">
                    {tpl.elements.length} elements
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-aura-500 transition-colors">
                  {tpl.title}
                </h4>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {tpl.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-aura-600 dark:text-aura-400">
                <span>Use Template</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
