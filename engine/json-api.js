import { processCommand } from "./interface";

function processJSONInput(jsonString) {
  let data;

  try {
    data = JSON.parse(jsonString);
  } catch (err) {
    return { error: "Invalid JSON format"};
  }

  const { command, modifier, filename } = data;

  if (!command) {
    return { error: "Missing 'command' in request data"};
  }

  return processCommand(command, modifier, filename);
}

module.exports = {
  processJSONInput
};