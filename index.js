const express = require('express');
const request = require('request');
const app = express();
const fs = require('fs');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const GPT_MODE = process.env.GPT_MODE;

let file_context = "You are a helpful Twitch Chatbot.";

const messages = [
  { role: "system", content: "You are a helpful Twitch Chatbot." }
];

console.log("GPT_MODE is " + GPT_MODE);
console.log("History length is " + process.env.HISTORY_LENGTH);
console.log("OpenAI API Key:" + process.env.OPENAI_API_KEY);

app.use(express.json({ extended: true, limit: '1mb' }));

app.all('/', (req, res) => {
  console.log("Just got a request!");
  res.send('Yo!');
});

async function readContextFile(filePath) {
  try {
    const data = await readFile(filePath, 'utf8');
    return data;
  } catch (err) {
    throw err;
  }
}

if (GPT_MODE === "CHAT") {
  readContextFile("./file_context.txt")
    .then((data) => {
      console.log("Reading context file and adding it as system level message for the agent.");
      messages[0].content = data;
    })
    .catch((err) => {
      console.error("Error reading context file:", err);
      process.exit(1);
    });
} else {
  readContextFile("./file_context.txt")
    .then((data) => {
      console.log("Reading context file and adding it in front of user prompts:");
      file_context = data;
      console.log(file_context);
    })
    .catch((err) => {
      console.error("Error reading context file:", err);
      process.exit(1);
    });
}

app.get('/gpt/:text', async (req, res) => {
  const text = req.params.text;
  const { Configuration, OpenAIApi } = require("openai");

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const openai = new OpenAIApi(configuration);

  try {
    if (GPT_MODE === "CHAT") {
      // CHAT MODE EXECUTION
      messages.push({ role: "user", content: text });

      if (messages.length > ((process.env.HISTORY_LENGTH * 2) + 1)) {
        console.log('Message amount in history exceeded. Removing oldest user and agent messages.');
        messages.splice(1, 2);
      }

      console.log("Messages: ");
      console.dir(messages);
      console.log("User Input: " + text);

      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: messages,
        temperature: 0.5,
        max_tokens: 128,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      if (response.data.choices) {
        let agent_response = response.data.choices[0].message.content;

        console.log("Agent answer: " + agent_response);
        messages.push({ role: "assistant", content: agent_response });

        if (agent_response.length > 399) {
          console.log("Agent answer exceeds twitch chat limit. Slicing to first 399 characters
