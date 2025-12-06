// src/screens/ChatbotScreen.js - AI Chatbot Interface
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

const ChatbotScreen = () => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Hello! I'm your EVSU eMAP assistant. I can help you find buildings, get directions, and answer questions about the campus. How can I assist you today?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  // Suggested questions
  const suggestedQuestions = [
    "Where is the library?",
    "Show me the cafeteria",
    "What buildings are near me?",
    "How do I get to the admin building?",
  ];

  // Scroll to bottom when new message is added
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Simulate AI response
  const generateAIResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Simple keyword-based responses (replace with actual AI integration)
    if (lowerMessage.includes('library') || lowerMessage.includes('lib')) {
      return "The library is located in Building A. You can search for it in the Search tab or view it on the map. Would you like me to show you the way?";
    } else if (lowerMessage.includes('cafeteria') || lowerMessage.includes('canteen') || lowerMessage.includes('food')) {
      return "The cafeteria is located in Building B, near the main entrance. It's open from 7 AM to 7 PM. Would you like directions?";
    } else if (lowerMessage.includes('admin') || lowerMessage.includes('administration')) {
      return "The administration building is Building C. You can find it on the map or search for 'Administration' in the Search tab.";
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return "Hello! How can I help you navigate the EVSU campus today?";
    } else if (lowerMessage.includes('help')) {
      return "I can help you:\n• Find buildings on campus\n• Get directions\n• Answer questions about facilities\n• Search for specific locations\n\nWhat would you like to know?";
    } else {
      return "I understand you're asking about: \"" + userMessage + "\". For specific building locations, I recommend using the Search tab or checking the Map. Is there a particular building or location you're looking for?";
    }
  };

  // Handle send message
  const handleSend = () => {
    if (inputText.trim().length === 0) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI typing delay
    setTimeout(() => {
      const aiResponse = {
        id: (Date.now() + 1).toString(),
        text: generateAIResponse(userMessage.text),
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1000);
  };

  // Handle suggested question
  const handleSuggestedQuestion = (question) => {
    setInputText(question);
    // Auto-send suggested questions
    setTimeout(() => {
      const userMessage = {
        id: Date.now().toString(),
        text: question,
        sender: 'user',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInputText(''); // Clear input after sending, consistent with handleSend
      setIsTyping(true);

      setTimeout(() => {
        const aiResponse = {
          id: (Date.now() + 1).toString(),
          text: generateAIResponse(question),
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
        setIsTyping(false);
      }, 1000);
    }, 100);
  };

  // Render message bubble
  const renderMessage = ({ item }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser && styles.userMessageContainer]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        ListHeaderComponent={
          messages.length === 1 ? (
            <View style={styles.suggestedContainer}>
              <Text style={styles.suggestedTitle}>Suggested questions:</Text>
              {suggestedQuestions.map((question, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestedButton}
                  onPress={() => handleSuggestedQuestion(question)}
                >
                  <Text style={styles.suggestedText}>{question}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        ListFooterComponent={
          isTyping ? (
            <View style={styles.typingContainer}>
              <View style={styles.typingBubble}>
                <View style={styles.typingDot} />
                <View style={[styles.typingDot, styles.typingDotDelay1]} />
                <View style={[styles.typingDot, styles.typingDotDelay2]} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Input Area */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor={Colors.textLight}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendButton, inputText.trim().length === 0 && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={inputText.trim().length === 0}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={inputText.trim().length > 0 ? Colors.white : Colors.textLight} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  messagesList: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  messageContainer: {
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.background,
    borderBottomLeftRadius: 4,
    ...Shadows.small,
  },
  messageText: {
    ...Typography.body,
    color: Colors.text,
    lineHeight: 20,
  },
  userMessageText: {
    color: Colors.white,
  },
  suggestedContainer: {
    marginBottom: Spacing.xl,
  },
  suggestedTitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  suggestedButton: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  suggestedText: {
    ...Typography.bodySmall,
    color: Colors.primary,
  },
  typingContainer: {
    marginBottom: Spacing.md,
    alignItems: 'flex-start',
  },
  typingBubble: {
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...Shadows.small,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textSecondary,
  },
  typingDotDelay1: {
    animationDelay: '0.2s',
  },
  typingDotDelay2: {
    animationDelay: '0.4s',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    ...Shadows.medium,
  },
  input: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.border,
  },
});

export default ChatbotScreen;
