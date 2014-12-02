

function ReadDatabasePartitions (vars) {
  return vars.data.toString( );
}
ReadDatabasePartitions.op = 15;

module.exports = ReadDatabasePartitions;
