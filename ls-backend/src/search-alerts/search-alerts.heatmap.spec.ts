import { SearchAlertsService } from './search-alerts.service';

describe('SearchAlertsService heatmap groupBy (AUD-007)', () => {
  it('agrege via groupBy, fusionne les casses et exclut les cles <=1', async () => {
    const prisma: any = {
      searchAlert: {
        groupBy: jest.fn().mockResolvedValue([
          { query: 'iPhone', _count: { query: 3 } },
          { query: 'iphone', _count: { query: 2 } },
          { query: 'PC', _count: { query: 5 } },
          { query: 'a', _count: { query: 9 } },
        ]),
      },
    };
    const svc = new SearchAlertsService(prisma, {} as any);
    const r = await svc.getSearchHeatmap();
    expect(prisma.searchAlert.groupBy).toHaveBeenCalled();
    const map = Object.fromEntries(r.data.map((x: any) => [x.query, x.count]));
    expect(map['iphone']).toBe(5); // 3+2 fusionnes (casse)
    expect(map['pc']).toBe(5);
    expect(map['a']).toBeUndefined(); // longueur <= 1 exclue
    expect(r.data.length).toBe(2);
  });
});
