import { normalizeTransportMode } from './transport-mode.utils';

describe('normalizeTransportMode', () => {
  it('maps bike-like values to okada', () => {
    expect(normalizeTransportMode('bike')).toBe('okada');
    expect(normalizeTransportMode('motorcycle')).toBe('okada');
    expect(normalizeTransportMode({ type: 'bike', name: 'Bike' })).toBe('okada');
  });

  it('maps keke-like values to keke', () => {
    expect(normalizeTransportMode('keke')).toBe('keke');
    expect(normalizeTransportMode('Keke NAPEP')).toBe('keke');
    expect(normalizeTransportMode({ type: 'keke', name: 'Keke NAPEP' })).toBe('keke');
  });

  it('keeps walking and bus labels stable', () => {
    expect(normalizeTransportMode('walk')).toBe('walk');
    expect(normalizeTransportMode('bus')).toBe('bus');
  });
});
