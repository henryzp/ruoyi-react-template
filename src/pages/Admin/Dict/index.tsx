import { useState } from 'react';
import type { DictType } from './types';
import DictTypePage from './DictType';
import DictDataPage from './DictData';
import RequirePermission from '@/components/RequirePermission';
import { permissionConfig } from '@/utils/permissionConfig';

const Dict = () => {
  const [managedType, setManagedType] = useState<DictType>();
  return (
    <RequirePermission rule={permissionConfig.system.dict.query}>
      <>
        <DictTypePage onManageData={setManagedType} />
        {managedType && (
          <DictDataPage
            open
            dictType={managedType.type}
            dictTypeName={managedType.name}
            onClose={() => setManagedType(undefined)}
          />
        )}
      </>
    </RequirePermission>
  );
};
export default Dict;
