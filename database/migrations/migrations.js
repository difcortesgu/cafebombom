// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from './0000_rich_pretty_boy.sql';
import m0001 from './0001_fuzzy_anthem.sql';
import m0002 from './0002_true_table_required.sql';
import journal from './meta/_journal.json';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  