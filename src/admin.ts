import { createConnection, ConnectionOptions, Entity, Connection, BaseEntity, Column, PrimaryGeneratedColumn,  ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSTypeorm from '@adminjs/typeorm';
import express from 'express';
import { User } from './entity/User';

AdminJS.registerAdapter({
  Resource: AdminJSTypeorm.Resource,
  Database: AdminJSTypeorm.Database,
})


function createEntityClass(schema: { name: string; tableName: string; columns: any }): any {
  // Define a new class dynamically
  class DynamicEntity extends BaseEntity {
    // Add decorators dynamically
    static getColumns() {
      const columns: any = {};
      const schemaColumns = schema.columns;
      for (const columnName in schemaColumns) {
        const column = schemaColumns[columnName];
        columns[columnName] = Column({
          type: column.type === 'ARRAY' ? 'jsonb' : column.type,
          nullable: column.nullable,
          length:column.length,
        });
      }
      return columns;
    }

    static getRelations() {
      const relations: any = {};
      const schemaRelations = schema.relations;
      for (const relationName in schemaRelations) {
        const relation = schemaRelations[relationName];
        const { type, targetEntity, inverseSide } = relation;
        if (type === 'many-to-one') {
          relations[relationName] = ManyToOne(() => targetEntity, { nullable: true });
          relations[relationName] = JoinColumn({ name: relationName });
        } else if (type === 'one-to-many') {
          relations[relationName] = OneToMany(() => targetEntity, inverseSide, { nullable: true });
        }
      }
      return relations;
    }

  }



  // Set the table name
  Entity({ name: schema.tableName })(DynamicEntity);

  // Define the columns
  const columns = DynamicEntity.getColumns();
  for (const [key, decorator] of Object.entries(columns)) {
    if(key=='id'||key=='session_key'){
      PrimaryGeneratedColumn()(DynamicEntity.prototype, key);
    }
    else{
    decorator(DynamicEntity.prototype, key);
    }
  }
  // Define the relations
  const relations = DynamicEntity.getRelations();
  for (const [key, relation] of Object.entries(relations)) {
    relation(DynamicEntity.prototype, key);
  }

  // Add primary key column if it's not explicitly defined
  const primaryKey = Object.keys(schema.columns).find(col => schema.columns[col].primary);
  if (!primaryKey || primaryKey==undefined) {
    PrimaryGeneratedColumn()(DynamicEntity.prototype, 'id');
  }
  const className = schema.name.charAt(0).toUpperCase() + schema.name.slice(1);

  // Set the entity name
  Object.defineProperty(DynamicEntity, 'name', { value: className });

  return DynamicEntity;
}

async function createDynamicResources(metadata: any[],  hiddenTables: string[] = []): Promise<any[]> {
  const resources = metadata.reduce((acc: any[], item: any) => {
    const { table_name, column_name, data_type, maximum_length, is_primary} = item;
    if (hiddenTables.includes(table_name)) {
      return acc;
    }
    // Find or create an entity schema for this table
    let entitySchema = acc.find((resource: any) => resource.tableName === table_name);
    if (!entitySchema) {
      entitySchema = {
        name: table_name,
        tableName: table_name,
        columns: {}
      };
      acc.push(entitySchema);
    }
    entitySchema.columns[column_name] = {
      type: data_type === 'character varying' ? 'varchar' : data_type, // Simplistic mapping
      nullable: true, // Adjust based on is_nullable if you fetch it
      length: maximum_length,
      primary: is_primary=='YES'?true:false
    };
    return acc;
  }, []);

  return resources.map(resource => (createEntityClass(resource)));
}

async function getTableMetadata(connection: Connection) {
  const query = `
    SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    CASE
        WHEN c.data_type IN ('character varying', 'character', 'text') THEN c.character_maximum_length
        WHEN c.data_type IN ('numeric', 'decimal') THEN c.numeric_precision
        ELSE NULL
    END AS maximum_length,
    CASE
        WHEN kcu.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END AS is_primary,
    CASE
        WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'YES'
        ELSE 'NO'
    END AS is_foreign_key,
    rcu.table_name AS referenced_table,
    rcu.column_name AS referenced_column
FROM 
    information_schema.columns c
LEFT JOIN 
    information_schema.key_column_usage kcu
    ON c.table_name = kcu.table_name
    AND c.column_name = kcu.column_name
    AND kcu.constraint_name IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE constraint_type = 'PRIMARY KEY'
          AND table_schema = c.table_schema
    )
LEFT JOIN 
    information_schema.table_constraints tc
    ON c.table_name = tc.table_name
    AND tc.constraint_type = 'FOREIGN KEY'
LEFT JOIN 
    information_schema.constraint_column_usage rcu
    ON tc.constraint_name = rcu.constraint_name
    AND c.column_name = rcu.column_name
WHERE 
    c.table_schema = 'public';
 -- Adjust schema if necessary
  `;
  const result = await connection.query(query);
  return result;
}

async function setupAdminJS() {
  const connection = await createConnection({
    type: 'postgres',
    host: "localhost",
    port: 5432,
    username: "your username",
    password: "your password",
    database: "your database name",
    synchronize: false,
  });

  const hiddenTables = ['']; // Specify the tables you want to hide

  const metadata = await getTableMetadata(connection);
  const resources = await createDynamicResources(metadata, hiddenTables);

  await connection.close();


  await createConnection({
    type: 'postgres',
    host: "localhost",
    port: 5432,
    username: "your username",
    password: "your password",
    database: "your database name",
    synchronize: false,
    entities: [...resources] // Include dynamic entities
  });
  
  const admin = new AdminJS({
    resources: [...resources],
    rootPath: '/admin',
  });

  const app = express();
  const ADMIN = AdminJSExpress.buildRouter(admin);
  app.use(admin.options.rootPath, ADMIN);

  app.listen(3000, () => console.log('AdminJS is running on http://localhost:3000'));
}

setupAdminJS().catch(err => console.error(err));
