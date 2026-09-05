import { Component, inject, signal, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import cytoscape, { Core } from 'cytoscape';
import { WorldService } from '../services/world.service';
import { GraphData } from '../models/world.models';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatChipsModule],
  templateUrl: './graph.component.html',
})
export class GraphComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cytoscapeContainer') containerRef!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private worldService = inject(WorldService);

  campaignId = signal('');
  loading = signal(true);
  graphData = signal<GraphData | null>(null);
  selectedNode = signal<{ name: string; id: string; entityTypeName: string } | null>(null);

  private cy: Core | null = null;

  ngOnInit() {
    const id = this.route.parent?.snapshot.params['id'] ?? '';
    this.campaignId.set(id);
    this.loadGraph();
  }

  ngAfterViewInit() {
    // If data already loaded before view init, render now
    const data = this.graphData();
    if (data) this.renderGraph(data);
  }

  ngOnDestroy() {
    this.cy?.destroy();
  }

  loadGraph() {
    this.loading.set(true);
    this.worldService.getGraph(this.campaignId()).subscribe({
      next: data => {
        this.graphData.set(data);
        this.loading.set(false);
        // Render after loading — AfterViewInit may have already fired
        setTimeout(() => this.renderGraph(data), 50);
      },
      error: () => this.loading.set(false),
    });
  }

  private renderGraph(data: GraphData) {
    if (!this.containerRef) return;
    this.cy?.destroy();

    const elements: cytoscape.ElementDefinition[] = [
      ...data.nodes.map(n => ({
        group: 'nodes' as const,
        data: {
          id: n.id,
          label: n.name,
          entityTypeName: n.entityTypeName,
          color: n.color ?? '#607D8B',
        },
      })),
      ...data.edges.map(e => ({
        group: 'edges' as const,
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
        },
      })),
    ];

    this.cy = cytoscape({
      container: this.containerRef.nativeElement,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '11px',
            'font-weight': 'bold',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'width': '60px',
            'height': '60px',
            'border-width': '2px',
            'border-color': '#fff',
            'text-outline-width': '2px',
            'text-outline-color': 'data(color)',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': '4px',
            'border-color': '#ffeb3b',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#bdbdbd',
            'target-arrow-color': '#bdbdbd',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'color': '#757575',
            'text-rotation': 'autorotate',
            'text-background-color': '#fff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px',
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#5C6BC0',
            'target-arrow-color': '#5C6BC0',
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 120,
        gravity: 0.1,
        numIter: 1000,
      } as any,
    });

    this.cy.on('tap', 'node', evt => {
      const node = evt.target;
      this.selectedNode.set({
        id: node.id(),
        name: node.data('label'),
        entityTypeName: node.data('entityTypeName'),
      });
    });

    this.cy.on('tap', evt => {
      if (evt.target === this.cy) this.selectedNode.set(null);
    });
  }

  fitGraph() { this.cy?.fit(undefined, 40); }
  resetLayout() { this.cy?.layout({ name: 'cose' } as any).run(); }

  get nodeCount() { return this.graphData()?.nodes.length ?? 0; }
  get edgeCount() { return this.graphData()?.edges.length ?? 0; }
}
