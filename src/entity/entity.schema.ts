import { EntitySchema } from 'typeorm';

export function createEntitySchema(tableName: string, columns: any[]): EntitySchema<any> {
  const entitySchema = {
    name: tableName,
    columns: columns.reduce((acc: any, column: any) => {
      const { column_name, data_type, is_nullable } = column;
      acc[column_name] = {
        type: data_type === 'character varying' ? 'varchar' : data_type,
        nullable: is_nullable === 'YES',
      };
      return acc;
    }, {}),
  };

  return new EntitySchema(entitySchema);
}
