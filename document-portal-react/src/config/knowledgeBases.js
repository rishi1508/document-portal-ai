// Knowledge base configuration with correct S3 folder names

export const KNOWLEDGE_BASES = {
  'common-policies': {
    id: 'common-policies',
    name: 'Common Policies',
    description: 'General company documents and policies',
    icon: 'FileText',
    prompts: [
      'What is our company vacation policy?',
      'How do I request time off?',
      'What are the password requirements?',
      'What is the remote work policy?'
    ]
  },
  devops: {
    id: 'devops',
    name: 'DevOps',
    description: 'DevOps documentation and guides',
    icon: 'Server',
    prompts: [
      'How do I deploy to production?',
      'What is our rollback procedure?',
      'How do I create a pull request?',
      'What are the CI/CD pipeline steps?'
    ]
  },
  'platform-engineering': {
    id: 'platform-engineering',
    name: 'Platform Engineering',
    description: 'Platform engineering resources',
    icon: 'Server',
    prompts: [
      'How do I set up infrastructure?',
      'What are our cloud architecture patterns?',
      'How do I configure monitoring?',
      'What is our disaster recovery plan?'
    ]
  },
  'solution-analysts': {
    id: 'solution-analysts',
    name: 'Solution Analysts',
    description: 'Solution architecture documentation',
    icon: 'Lightbulb',
    prompts: [
      'What are our solution design patterns?',
      'How do I document requirements?',
      'What is our technical review process?',
      'How do I create solution proposals?'
    ]
  },
  'product-management': {
    id: 'product-management',
    name: 'Product Management',
    description: 'Product management resources',
    icon: 'Lightbulb',
    prompts: [
      'How do I create a product roadmap?',
      'What is our feature prioritization process?',
      'How do I gather user feedback?',
      'What are our product metrics?'
    ]
  }
}

export const ROLE_PERMISSIONS = {
  devops: {
    knowledgeBases: ['common-policies', 'devops']
  },
  platform: {
    knowledgeBases: ['common-policies', 'platform-engineering']
  },
  solution: {
    knowledgeBases: ['common-policies', 'solution-analysts']
  },
  product: {
    knowledgeBases: ['common-policies', 'product-management']
  },
  general: {
    knowledgeBases: ['common-policies']
  }
}
