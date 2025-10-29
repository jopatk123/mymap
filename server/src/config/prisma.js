const { PrismaClient } = require('@prisma/client');
const config = require('./index');

let prisma = null;

const getPrisma = () => {
  if (!prisma) {
    const datasourceUrl = config.database.url || `file:${config.database.path}`;
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: datasourceUrl.startsWith('file:') ? datasourceUrl : `file:${datasourceUrl}`,
        },
      },
    });
  }
  return prisma;
};

module.exports = {
  getPrisma,
};
