import {
  buildIndicatorDisplayName,
  findDateColumn,
  getSqliteDb,
  getTableColumns,
  parseVariableId,
  quoteSqlIdentifier,
} from "@/app/api/utils/sqlite";

// Calculate operations between two variables
export async function POST(request) {
  try {
    const db = getSqliteDb();
    const body = await request.json();
    const { variable1Id, variable2Id, operation, startDate, endDate } = body;

    if (!variable1Id || !variable2Id || !operation) {
      return Response.json(
        {
          error: "Missing required fields: variable1Id, variable2Id, operation",
        },
        { status: 400 },
      );
    }

    const left = parseVariableId(variable1Id);
    const right = parseVariableId(variable2Id);

    if (!left || !right) {
      return Response.json({ calculatedData: [], operation });
    }

    const leftColumns = getTableColumns(db, left.tableName);
    const rightColumns = getTableColumns(db, right.tableName);
    const leftDateColumn = findDateColumn(leftColumns);
    const rightDateColumn = findDateColumn(rightColumns);

    const leftHasValue = leftColumns.some(
      (column) => column.name === left.columnName,
    );
    const rightHasValue = rightColumns.some(
      (column) => column.name === right.columnName,
    );

    if (!leftDateColumn || !rightDateColumn || !leftHasValue || !rightHasValue) {
      return Response.json({ calculatedData: [], operation });
    }

    const leftTableSql = quoteSqlIdentifier(left.tableName);
    const rightTableSql = quoteSqlIdentifier(right.tableName);
    const leftValueSql = quoteSqlIdentifier(left.columnName);
    const rightValueSql = quoteSqlIdentifier(right.columnName);
    const leftDateSql = quoteSqlIdentifier(leftDateColumn);
    const rightDateSql = quoteSqlIdentifier(rightDateColumn);

    let query = `
      SELECT
        a.${leftDateSql} AS recorded_at,
        CAST(a.${leftValueSql} AS REAL) AS value1,
        CAST(b.${rightValueSql} AS REAL) AS value2
      FROM ${leftTableSql} a
      JOIN ${rightTableSql} b
        ON a.${leftDateSql} = b.${rightDateSql}
      WHERE a.${leftValueSql} IS NOT NULL
        AND b.${rightValueSql} IS NOT NULL
    `;

    const params = [];

    if (startDate) {
      query += ` AND a.${leftDateSql} >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND a.${leftDateSql} <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY a.${leftDateSql} ASC`;

    const results = db.prepare(query).all(...params);

    // Perform calculation
    const calculatedData = results.map((row) => {
      let result;
      const val1 = parseFloat(row.value1);
      const val2 = parseFloat(row.value2);

      switch (operation) {
        case "subtract":
          result = val1 - val2;
          break;
        case "add":
          result = val1 + val2;
          break;
        case "multiply":
          result = val1 * val2;
          break;
        case "divide":
          result = val2 !== 0 ? val1 / val2 : 0;
          break;
        default:
          result = 0;
      }

      return {
        recorded_at: row.recorded_at,
        value1: val1,
        value2: val2,
        result: parseFloat(result.toFixed(2)),
        variable1_name: buildIndicatorDisplayName(left.tableName, left.columnName),
        variable2_name: buildIndicatorDisplayName(right.tableName, right.columnName),
        unit1: "",
        unit2: "",
      };
    });

    return Response.json({
      calculatedData,
      operation,
      variable1: results[0]?.variable1_name,
      variable2: results[0]?.variable2_name,
    });
  } catch (error) {
    console.error("Error calculating data:", error);
    return Response.json(
      { error: "Failed to calculate data" },
      { status: 500 },
    );
  }
}
