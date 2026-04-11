// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_pale_wildside.sql';
import m0001 from './0001_receipt_preferences.sql';
import m0002 from './0002_product_image.sql';
import m0003 from './0003_paid_status_to_flag.sql';
import m0004 from './0004_payment_method_optional.sql';
import m0005 from './0005_next_logan.sql';

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
  