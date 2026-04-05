// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from './0000_motionless_nemesis.sql';
import m0001 from './0001_table_order_type_flags.sql';
import m0002 from './0002_table_type.sql';
import m0003 from './0003_surcharge_settings.sql';
import m0004 from './0004_surcharges_table.sql';
import m0005 from './0005_sales_payment_method.sql';
import journal from './meta/_journal.json';

  export default {
    journal,
    migrations: {
      m0000,
      m0001,
      m0002,
      m0003,
      m0004,
      m0005
    }
  }
  