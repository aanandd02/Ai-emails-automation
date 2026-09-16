export const profile = {
  name: "Anand Shukla",
  location: "Mirzapur, Uttar Pradesh, India",
  phone: "+91-9076823328",
  email: "aanandd9076@gmail.com",
  education: {
    institution: "Indian Institute of Information Technology Nagpur",
    shortInstitution: "IIIT Nagpur",
    degree: "Bachelor of Technology in Electronics and Communication Engineering",
    shortDegree: "B.Tech ECE",
    timeline: "Nov 2022 – Jun 2026",
    gradYear: "2026",
    coursework: [
      "Data Structures & Algorithms",
      "Operating Systems",
      "Object-Oriented Programming",
      "Database Management Systems",
      "Computer Networks",
    ],
  },
  links: {
    portfolio: "https://anand-shukla02.onrender.com/",
    resume: "https://drive.google.com/file/d/1tppKMCDPsWeHdtFIaMD-jWEUdVSz9hW-/view?usp=sharing",
    linkedin: "https://www.linkedin.com/in/aanandd02",
    github: "https://github.com/aanandd02",
    leetcode: "https://leetcode.com/u/aanandd02",
  },
  achievements: {
    leetcode: {
      title: "LeetCode Knight",
      rating: 2006,
      topPercent: "2.44%",
      problemsSolved: "400+",
    },
    deployedSystems: "6+ backend systems deployed using Node.js, MongoDB, MySQL, and AWS",
  },
  experience: [
    {
      company: "Synup",
      role: "SDE Intern",
      timeline: "Jan 2026 – Apr 2026",
      location: "Bengaluru, Karnataka, India",
      highlights: [
        "Architected a serverless microservices pipeline using AWS Lambda, MySQL and Elasticsearch for event-driven fan-out processing, reducing failures by ~40%",
        "Resolved a critical race condition using transaction-safe MySQL updates across concurrent services, improving consistency and reliability of distributed workflows",
      ],
      techStack: ["AWS Lambda", "MySQL", "Elasticsearch", "Microservices", "Event-Driven Architecture"],
    },
    {
      company: "BrandX",
      role: "SDE Intern",
      timeline: "Oct 2025 – Jan 2026",
      location: "Noida, India",
      highlights: [
        "Developed a concurrent-safe booking system using Node.js and MongoDB with atomic slot allocation and reservation workflows",
        "Optimized database queries and introduced compound indexing, reducing API response latency by ~35% under peak traffic",
      ],
      techStack: ["Node.js", "MongoDB", "REST APIs", "Compound Indexing"],
    },
  ],
  projects: [
    {
      name: "Enterprise RAG & Agent Platform",
      tagline: "Production-grade autonomous AI knowledge system",
      tech: ["Python", "FastAPI", "LangGraph", "Qdrant", "PostgreSQL", "Redis", "Docker", "RAGAS"],
      highlights: [
        "Hybrid retrieval with semantic chunking, embeddings, reranking, and citation-grounded answer generation",
        "LangGraph multi-tool agent supporting query rewriting, web search, PostgreSQL tools, and multi-step reasoning",
        "Async ingestion with Redis and Celery; evaluated using RAGAS for faithfulness and retrieval quality",
      ],
    },
    {
      name: "AI Code Intelligence & Review Agent",
      tagline: "Repository-aware AI coding assistant",
      tech: ["Python", "FastAPI", "React", "LLM APIs", "Qdrant", "Tree-sitter", "Docker"],
      highlights: [
        "Language-aware code chunking with Tree-sitter and vector retrieval in Qdrant",
        "Agentic workflow for repository analysis, issue investigation, and structured patch generation",
      ],
    },
    {
      name: "Multimodal Document Intelligence",
      tagline: "AI-powered document understanding pipeline",
      tech: ["Python", "FastAPI", "Vision LLM", "OCR", "OpenCV", "AWS S3", "SQS", "Lambda"],
      highlights: [
        "Multimodal invoice/document extraction combining OCR, vision-language models, and structured JSON extraction",
        "Asynchronous AWS S3/SQS/Lambda processing with confidence scoring and failure handling",
      ],
    },
  ],
  skills: {
    programming: ["Python", "Java", "JavaScript", "SQL"],
    ai: [
      "LLM Applications",
      "Prompt Engineering",
      "RAG",
      "Agentic AI",
      "Tool Calling",
      "Embeddings",
      "Semantic Search",
      "Multimodal AI",
    ],
    frameworks: [
      "LangChain",
      "LangGraph",
      "LlamaIndex",
      "Hugging Face Transformers",
      "OpenAI API",
      "Google Gemini API",
      "Ollama",
    ],
    vectorSearch: ["Qdrant", "Embeddings", "Semantic Search", "Hybrid Search", "Reranking"],
    backend: [
      "FastAPI",
      "Node.js",
      "Express.js",
      "REST APIs",
      "WebSockets",
      "JWT",
      "Microservices",
      "Event-Driven Architecture",
    ],
    databases: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "DynamoDB"],
    cloudDevOps: [
      "AWS Lambda",
      "EC2",
      "API Gateway",
      "S3",
      "SQS",
      "SNS",
      "CloudWatch",
      "Docker",
      "Git",
      "GitHub",
      "Postman",
    ],
  },
  rawResume: `
Anand Shukla
Mirzapur, Uttar Pradesh, India | +91-9076823328 | aanandd9076@gmail.com
LinkedIn | GitHub | LeetCode
Education
Indian Institute of Information Technology Nagpur Bachelor of Technology in Electronics and Communication Engineering Nov 2022 – Jun 2026
Nagpur, Maharashtra
Relevant Coursework: Data Structures & Algorithms, Operating Systems, Object-Oriented Programming, Database Management Systems, Computer Networks

Technical Skills
Programming: Python, Java, JavaScript, SQL
AI / LLM: LLM Applications, Prompt Engineering, RAG, Agentic AI, Tool Calling / Function Calling, AI Evaluation, Embeddings, Semantic Search, Multimodal AI
AI Frameworks: LangChain, LangGraph, LlamaIndex, Hugging Face Transformers, OpenAI API, Google Gemini API, Ollama
Vector Search: Qdrant, Embeddings, Semantic Search, Hybrid Search, Reranking
Backend: FastAPI, Node.js, Express.js, REST APIs, WebSockets, JWT, Microservices, Event-Driven Architecture
Databases: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch, DynamoDB
Cloud / DevOps: AWS Lambda, EC2, API Gateway, S3, SQS, SNS, CloudWatch, Docker, Git, GitHub, Postman

Experience
Synup Jan 2026 – Apr 2026
SDE Intern Bengaluru, Karnataka, India
• Architected a serverless microservices pipeline using AWS Lambda, MySQL and Elasticsearch for event-driven fan-out processing, reducing failures by ~40%.
• Resolved a critical race condition using transaction-safe MySQL updates across concurrent services, improving consistency and reliability of distributed workflows.

BrandX Oct 2025 – Jan 2026
SDE Intern Noida, India
• Developed a concurrent-safe booking system using Node.js and MongoDB with atomic slot allocation and reservation workflows.
• Optimized database queries and introduced compound indexing, reducing API response latency by ~35% under peak traffic.

Projects
Enterprise RAG & Agent Platform (Python, FastAPI, LangGraph, Qdrant, PostgreSQL, Redis, Docker)
Production-grade autonomous AI knowledge system
• Built a production-style RAG platform for PDF/DOCX knowledge bases with document parsing, semantic chunking, embeddings, hybrid retrieval, reranking and citation-grounded answer generation.
• Developed a LangGraph-based multi-tool agent supporting query rewriting, knowledge retrieval, web search, PostgreSQL tools, conversation memory and multi-step reasoning.
• Implemented asynchronous document processing with Redis, Celery and Docker, enabling scalable ingestion and background task execution across distributed workloads.
• Added RAG evaluation pipelines using RAGAS to measure retrieval quality, answer relevance, faithfulness and hallucination-related performance.

AI Code Intelligence & Review Agent (Python, FastAPI, React, LLM APIs, Qdrant, Tree-sitter, Docker)
Repository-aware AI coding assistant
• Developed a repository-aware coding agent that indexes source code for semantic search and generates context-aware explanations, reviews and fixes.
• Built an agentic workflow for repository analysis, issue investigation, code search, test generation and structured patch recommendations using tool calling.
• Implemented language-aware code chunking with Tree-sitter and vector retrieval to supply relevant code context to LLMs.

Multimodal Document Intelligence (Python, FastAPI, Vision LLM, OCR, OpenCV, AWS S3, SQS, Lambda)
AI-powered document understanding pipeline
• Built a multimodal document processing pipeline for invoices and business documents combining OCR, vision-language models and structured JSON extraction.
• Designed asynchronous AWS S3/SQS/Lambda processing with validation, confidence scoring and failure handling for scalable document workloads.

Achievements
• LeetCode Knight with a contest rating of 2006, ranking in the top 2.44% globally; solved 400+ algorithmic problems across data structures and advanced algorithms.
• Delivered and deployed 6+ backend systems using Node.js, MongoDB, MySQL and AWS, applying distributed systems and scalable architecture principles.
  `.trim(),
};

export default profile;
