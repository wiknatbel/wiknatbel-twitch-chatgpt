const express = require('express');
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const { Configuration, OpenAIApi } = require("openai");

const app = express();
const GPT_MODE = process.env.GPT_MODE;

let file_context = "You are a helpful Twitch Chatbot.";

const messages = [
  { role: "system", content: "You are a helpful Twitch Chatbot." }
];

console.log("GPT_MODE is " + GPT_MODE);
console.log("History length is " + process.env.HISTORY_LENGTH);
console.log("OpenAI API Key: " + process.env.OPENAI_API_KEY);

app.use(express.json({ extended: true, limit: '1mb', timeout: 10000 })); // 10 másodperc időkorlát

async function readContextFile(filePath) {
  try {
    const data = await readFile(filePath, 'utf8');
    return data;
  } catch (err) {
    throw err;
  }
}

async function initializeContext() {
  try {
    const data = await readContextFile("./file_context.txt");
    console.log("Reading context file: " + data);

    if (GPT_MODE === "CHAT") {
      console.log("Adding context as system level message for the agent.");
      messages[0].content = data;
    } else {
      console.log("Adding context in front of user prompts.");
      file_context = data;
      console.log(file_context);
    }
  } catch (err) {
    console.error("Error reading context file:", err);
    process.exit(1);
  }
}

initializeContext();

app.get('/gpt/:text', async (req, res) => {
  const text = req.params.text;

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);

  try {
    if (GPT_MODE === "CHAT") {
      // CHAT MODE EXECUTION
      messages.push({ role: "user", content: text });

      if (messages.length > (parseInt(process.env.HISTORY_LENGTH) * 2 + 1)) {
        console.log('Message amount in history exceeded. Removing oldest user and agent messages.');
        messages.splice(1, 2);
      }

      console.log("Messages:");
      console.dir(messages);
      console.log("User Input: " + text);

      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-jayden",
        messages: messages,
        temperature: 0.5,
        max_tokens: 128,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      if (response.data.choices && response.data.choices.length > 0) {
        let agent_response = response.data.choices[0].message.content;

        console.log("Agent answer: " + agent_response);
        messages.push({ role: "assistant", content: agent_response });

        if (agent_response.length > 399) {
          console.log("Agent answer exceeds twitch chat limit. Slicing to first 399 characters");
          agent_response = agent_response.slice(0, 399);
        }

        res.send(agent_response);
      } else {
        res.status(500).send("No response from OpenAI API.");
      }
    } else {
      // Non-CHAT MODE EXECUTION
      console.log("Non-CHAT mode is not implemented yet.");
      res.status(500).send("Non-CHAT mode is not implemented yet.");
    }
  } catch

     
