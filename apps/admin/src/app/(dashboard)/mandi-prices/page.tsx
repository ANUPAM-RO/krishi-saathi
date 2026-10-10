'use client';

import { Box, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ImportTab } from './_components/ImportTab';
import { MandisTab } from './_components/MandisTab';
import { PricesTab } from './_components/PricesTab';

const TABS = ['prices', 'import', 'mandis'] as const;
type TabKey = (typeof TABS)[number];

export default function MandiPricesPage() {
  const [tab, setTab] = useState<TabKey>('prices');

  return (
    <>
      <PageHeader
        title="Mandi Prices"
        subtitle="Daily market prices shown to farmers and used for profit estimates. Prices are per quintal unless noted."
      />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v: TabKey) => setTab(v)} variant="scrollable" allowScrollButtonsMobile>
          <Tab value="prices" label="Prices" />
          <Tab value="import" label="CSV import" />
          <Tab value="mandis" label="Mandis" />
        </Tabs>
      </Box>
      {tab === 'prices' && <PricesTab />}
      {tab === 'import' && <ImportTab onDone={() => setTab('prices')} />}
      {tab === 'mandis' && <MandisTab />}
    </>
  );
}
