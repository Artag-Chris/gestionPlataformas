-- Delete the 0_init migration record so we can re-run it
DELETE FROM "_prisma_migrations" WHERE migration = '0_init';
