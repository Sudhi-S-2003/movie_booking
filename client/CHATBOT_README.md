# Chatbot Builder - Frontend Documentation

Welcome to the Chatbot Builder! This powerful system allows you to build dynamic, interactive, and automated conversational experiences without writing any code.

This document explains every core component available in the frontend UI, what it does, how to use it, and its overall purpose in creating your perfect chatbot.

---

## 1. Chatbot Overview
The **Chatbot** is the container for your entire conversational experience. Think of it as the "brain" that houses all your specific rules, messages, and flows.
- **Type**: `Support`, `Sales`, `Booking`, etc.
- **Purpose**: Groups all your conversational logic under one unique identity (e.g., "Main Website Bot" vs. "Mobile App Bot").

---

## 2. Variables
Variables allow the chatbot to remember things about the user or the conversation, creating a highly personalized experience.
- **What it is**: Dynamic placeholders (e.g., `{{user_name}}`, `{{booking_date}}`).
- **How to use it**: If you ask a user for their name and save it to the variable `user_name`, you can later have the bot say: *"Thanks, {{user_name}}!"*
- **Purpose**: Enables the chatbot to collect, store, and dynamically recall state across different dialogue steps.

---

## 3. Keywords (Triggers)
Keywords act as the "ears" of your chatbot. They listen to what the user types and trigger specific actions when a match is found.
- **Match Types**:
  - `exact`: The user must type the word exactly (e.g., "menu").
  - `contains`: The word just has to be somewhere in the sentence (e.g., "show me the menu please").
  - `regex`: Advanced pattern matching.
- **How to use it**: Link a Keyword to a **Template**, **Menu**, or **Flow**. If a user types the keyword, the chatbot immediately interrupts what it's doing and jumps to the linked action.
- **Purpose**: Provides a way for users to naturally navigate your chatbot using free-text typing.

---

## 4. Templates (Responses)
Templates are the actual messages that the chatbot sends back to the user.
- **What it is**: The text bubble (or media) the user sees.
- **How to use it**: Create a greeting template like *"Hello! How can I help you today?"* Templates can include your dynamic **Variables**.
- **Purpose**: Separating the "content" (Templates) from the "logic" (Flows/Menus) allows you to reuse the same message in multiple different places without typing it out twice.

---

## 5. Flow Builder (Dialogue Steps)
The Flow Builder allows you to sequence messages together to form an automated, multi-step conversation.
- **What it is**: A chain of steps (Step 1 → Step 2 → Step 3).
- **Properties**:
  - `Step Name`: Internal name for organizing.
  - `Previous Step Node`: Tells the system which step this one comes *after*.
  - `Response Template`: The message the bot will send when it reaches this step.
- **Purpose**: Used for linear interactions where the bot needs to lead the user through a specific journey (e.g., an onboarding sequence or a guided tutorial).

---

## 6. Menus (Quick Reply Options)
Menus are interactive cards presented to the user with clickable buttons.
- **What it is**: A structured message with a Title, Body, and an array of clickable "Options".
- **Action Types per Option**:
  - **Trigger Template**: Clicking the button immediately sends a specific text template back.
  - **Enter Dialogue Step**: Clicking the button drops the user into a specific point in your **Flow Builder**.
  - **Route Submenu Card**: Clicking the button opens up *another* Menu (nested menus).
- **How to use it**: Use it to create your main "Help Desk" navigation so users can click their way to an answer instead of typing.
- **Purpose**: Drastically improves user experience by providing clear, clickable paths, reducing the chance that the user types something the bot doesn't understand.

---

## 7. Registration Wizard (Form Fields)
Form fields allow the chatbot to enter a strict "data collection" mode. Instead of casual conversation, it acts like an interactive form.
- **Field Types**: `text`, `number`, `email`, `phone`, `date`, `select` (Dropdown).
- **How to use it**: 
  1. Define your fields (e.g., "Email Address" -> `email` type).
  2. The bot will ask the user for their email.
  3. If the user types an invalid email, the bot uses the `Validation Error Message` to reject it and ask again.
  4. Once validated, the data is saved, and the bot moves to the next field.
- **Submission Action**: Once the user fills out the final field in the wizard, the chatbot automatically sends a linked **Template** (e.g., "Thanks, your form is submitted!").
- **Purpose**: Capturing structured, validated data from users (like lead generation, booking details, or support tickets) directly inside the chat window.

---

## Summary Workflow
To build a successful chatbot, you typically:
1. Write your messages (**Templates**).
2. Set up your main navigation interface (**Menus**).
3. Build guided conversations (**Flows**) or data-collection processes (**Forms**).
4. Connect them all together using clickable buttons or text listeners (**Keywords**).

By mixing and matching these 7 core types, you can build everything from a simple FAQ auto-responder to a complex, data-driven booking assistant!
