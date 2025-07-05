# Migração do Leaflet para MapLibre GL JS

## Alterações realizadas

### 1. Dependências
- **Adicionadas**: `maplibre-gl` e `@types/maplibre-gl`
- **Removidas**: Dependências do Leaflet (mantidas para compatibilidade com outros componentes)

### 2. Configuração do Angular
- Adicionado `maplibre-gl.css` ao `angular.json`
- Adicionado `maplibre-gl` à lista de `allowedCommonJsDependencies`

### 3. Refatoração do componente MapVectorComponent

#### Imports
```typescript
// Antes
import * as L from 'leaflet';
import 'leaflet.awesome-markers';
import 'leaflet-rotatedmarker';

// Depois
import maplibregl from 'maplibre-gl';
```

#### Propriedades da classe
```typescript
// Antes
private map: L.Map | null = null;
private busMarkers = new Map<string, L.Marker>();
private polylines: L.Polyline[] = [];

// Depois
private map: maplibregl.Map | null = null;
private busMarkers = new Map<string, maplibregl.Marker>();
private polylinesSources: string[] = [];
```

#### Inicialização do mapa
```typescript
// Antes
this.map = L.map('map', {
  center: [-15.6014, -56.0979],
  zoom: 15,
  preferCanvas: true
});

// Depois
this.map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.openfreemap.org/styles/liberty',
  center: [-56.0979, -15.6014],
  zoom: 15
});
```

#### Marcadores
```typescript
// Antes - Leaflet
const marker = L.marker([lat, lng], {
  icon: busIcon,
  rotationAngle: bus.orientacaoInt || 0
}).addTo(this.map);

// Depois - MapLibre GL JS
const marker = new maplibregl.Marker({
  element: markerElement,
  rotation: bus.orientacaoInt || 0
})
  .setLngLat([lng, lat])
  .addTo(this.map);
```

#### Polylines
```typescript
// Antes - Leaflet
const way = L.polyline(wayCoordinates, {
  color: 'red',
  weight: 3,
  opacity: 0.7
}).addTo(this.map);

// Depois - MapLibre GL JS
this.map.addSource(sourceId, {
  type: 'geojson',
  data: {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: wayCoordinates
    }
  }
});

this.map.addLayer({
  id: layerId,
  type: 'line',
  source: sourceId,
  paint: {
    'line-color': '#ff0000',
    'line-width': 3,
    'line-opacity': 0.7
  }
});
```

### 4. Controles do mapa
```typescript
// Controles de navegação
this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

// Controle de escala
this.map.addControl(new maplibregl.ScaleControl({
  maxWidth: 80,
  unit: 'metric'
}), 'bottom-left');
```

### 5. Estilos CSS
- Removidos estilos específicos do Leaflet
- Adicionados estilos específicos do MapLibre GL JS
- Mantidos estilos dos marcadores customizados

### 6. Tile Provider
- **Antes**: CartoDB tiles
- **Depois**: OpenFreeMap Liberty style (`https://tiles.openfreemap.org/styles/liberty`)

## Benefícios da migração

1. **Performance**: MapLibre GL JS renderiza usando WebGL, oferecendo melhor performance
2. **Estilo de mapa**: Usa vector tiles com estilos modernos
3. **Controles**: Controles mais modernos e responsivos
4. **Rotação**: Melhor suporte para rotação de marcadores
5. **Animações**: Animações mais suaves
6. **Menor bundle size**: Biblioteca mais leve

## Funcionalidades mantidas

- ✅ Marcadores de ônibus com rotação
- ✅ Popups com informações do ônibus
- ✅ Polylines das rotas
- ✅ Animação de movimento dos marcadores
- ✅ Controles de zoom e navegação
- ✅ Controle de escala
- ✅ Fit bounds para mostrar todas as rotas
- ✅ Limpeza de recursos ao destruir o componente

## Possíveis melhorias futuras

1. **Clustering**: Implementar clustering para muitos marcadores
2. **Layers**: Adicionar layers adicionais (trânsito, pontos de parada)
3. **Interatividade**: Adicionar mais interações com o mapa
4. **Offline**: Suporte para mapas offline
5. **Terrain**: Adicionar dados de elevação
