/**
 * Layer Renderer - Renders context layers as interactive cards
 */

export class LayerRenderer {
  constructor(container) {
    this.container = container;
    this.expandedRefs = new Set();
  }

  /**
   * Render all layers
   */
  render(layers) {
    this.container.innerHTML = '';

    if (!layers || layers.length === 0) {
      this.container.innerHTML = this.renderEmptyState();
      return;
    }

    layers.forEach((layer, index) => {
      const element = this.renderLayer(layer, index);
      this.container.appendChild(element);
    });
  }

  /**
   * Render a single layer card
   */
  renderLayer(layer, index) {
    const div = document.createElement('div');
    div.className = `layer layer--${layer.type}`;
    div.dataset.layerId = layer.id;

    div.innerHTML = `
      <div class="layer-header" onclick="window.toggleLayer('${layer.id}')">
        <div class="layer-title-group">
          <div class="layer-indicator"></div>
          <span class="layer-title">${this.escapeHtml(layer.title)}</span>
          <span class="layer-subtitle">${this.escapeHtml(layer.subtitle || '')}</span>
        </div>
        <div class="layer-meta">
          <span class="layer-badge">${this.escapeHtml(layer.badge)}</span>
          <svg class="layer-toggle" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
          </svg>
        </div>
      </div>
      <div class="layer-content">
        ${this.renderLayerContent(layer)}
      </div>
    `;

    return div;
  }

  /**
   * Render layer content based on type
   */
  renderLayerContent(layer) {
    if (layer.isJson) {
      return this.renderJsonContent(layer.content);
    }

    return this.renderCodeContent(layer.content, layer.fileRefs);
  }

  /**
   * Render content as code with line numbers
   */
  renderCodeContent(content, fileRefs = []) {
    if (!content) {
      return '<div class="empty-state"><div class="empty-state-title">No content</div></div>';
    }

    const lines = content.split('\n');
    let html = '<div class="code-view">';

    lines.forEach((line, i) => {
      const lineNum = i + 1;
      let processedLine = this.escapeHtml(line);

      // Highlight file references
      if (fileRefs.length > 0) {
        fileRefs.forEach(ref => {
          const escapedRef = this.escapeHtml(ref);
          const regex = new RegExp(`(@${escapedRef}|\`${escapedRef}\`)`, 'g');
          processedLine = processedLine.replace(regex, (match) => {
            return `<span class="file-ref" data-file="${escapedRef}" onclick="window.expandFileRef(this, '${escapedRef}')">
              <span class="file-ref-icon">+</span>
              <span class="file-ref-name">${escapedRef}</span>
            </span>`;
          });
        });
      }

      html += `
        <div class="code-line">
          <span class="code-line-number">${lineNum}</span>
          <span class="code-line-content">${processedLine || ' '}</span>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Render JSON with syntax highlighting
   */
  renderJsonContent(content) {
    if (!content) {
      return '<div class="empty-state"><div class="empty-state-title">No content</div></div>';
    }

    const highlighted = this.highlightJson(content);
    const lines = highlighted.split('\n');
    let html = '<div class="code-view">';

    lines.forEach((line, i) => {
      html += `
        <div class="code-line">
          <span class="code-line-number">${i + 1}</span>
          <span class="code-line-content">${line || ' '}</span>
        </div>
      `;
    });

    html += '</div>';
    return html;
  }

  /**
   * Simple JSON syntax highlighting
   */
  highlightJson(json) {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Keys
      .replace(/"([^"]+)":/g, '<span class="json-key">"$1"</span>:')
      // String values
      .replace(/: "([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      // Numbers
      .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
      // Booleans
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      // Null
      .replace(/: null/g, ': <span class="json-null">null</span>');
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">&#128269;</div>
        <div class="empty-state-title">No context data loaded</div>
        <p>Select a working directory to view its context composition.</p>
      </div>
    `;
  }

  /**
   * Escape HTML entities
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Toggle layer collapse state
   */
  toggleLayer(layerId) {
    const layer = this.container.querySelector(`[data-layer-id="${layerId}"]`);
    if (layer) {
      layer.classList.toggle('collapsed');
    }
  }

  /**
   * Expand all layers
   */
  expandAll() {
    this.container.querySelectorAll('.layer').forEach(layer => {
      layer.classList.remove('collapsed');
    });
  }

  /**
   * Collapse all layers
   */
  collapseAll() {
    this.container.querySelectorAll('.layer').forEach(layer => {
      layer.classList.add('collapsed');
    });
  }
}

export default LayerRenderer;
