import React from 'react'
import { useChat } from '../../contexts/ChatContext'
import { KNOWLEDGE_BASES } from '../../config/knowledgeBases'
import { Bot, Brain, Zap, Shield } from 'lucide-react'


const WelcomeScreen = () => {
  const { currentKB, addMessage, setIsLoading } = useChat()
  const kb = KNOWLEDGE_BASES[currentKB]


  const handlePromptClick = async (prompt) => {
    // Add user message immediately
    addMessage('user', prompt, [])


    // Show loading
    setIsLoading(true)


    // Simulate AI response
    setTimeout(() => {
      const mockResponse = getMockResponse(prompt)
      addMessage('assistant', mockResponse.answer, mockResponse.sources)
      setIsLoading(false)
    }, 1500)
  }


  const getMockResponse = (question) => {
    const lowerQ = question.toLowerCase()


    if (lowerQ.includes('deployment') || lowerQ.includes('deploy')) {
      return {
        answer: `Based on our DevOps deployment guidelines, the deployment process consists of 7 main steps:


**1. Local Testing**
Run all unit and integration tests locally before creating a pull request.


**2. Create Pull Request**
Branch from main with descriptive commits following our naming conventions.


**3. Code Review**
Obtain at least 2 approvals from team members before merging.


**4. Deploy to Staging**
Automatic deployment triggers after merge to the staging branch.


**5. Staging Validation**
Run comprehensive smoke tests and verify all functionality works as expected.


**6. Production Deployment**
Schedule deployments during low-traffic hours (typically 2-4 AM EST) to minimize user impact.


**7. Post-Deployment Monitoring**
Monitor health checks, error rates, and application metrics for at least 2 hours after deployment.


Always have a rollback plan ready and notify the team via Slack before production deployments.`,
        sources: ['s3://document-portal-storage/devops/deployment-guide.md']
      }
    }


    if (lowerQ.includes('password') || lowerQ.includes('security')) {
      return {
        answer: `According to our company security policy, here are the password requirements:


**Password Requirements:**
• Minimum 12 characters in length
• Must include uppercase AND lowercase letters
• Must include at least one number
• Must include at least one special character (!@#$%^&*)
• Cannot reuse your last 5 passwords
• Must be changed every 90 days


**Additional Security Measures:**
• Multi-factor authentication (MFA) is required for all systems
• Quarterly access rights reviews are conducted
• Immediate credential revocation upon employee termination
• Principle of least privilege is strictly enforced
• Role-based access control (RBAC) for all applications


**Reporting Security Incidents:**
If you suspect a security breach, immediately contact the Security team at security@company.com or call the hotline at ext. 911.`,
        sources: ['s3://document-portal-storage/policies/security-policy.pdf']
      }
    }


    if (lowerQ.includes('rollback')) {
      return {
        answer: `Our rollback strategy includes the following procedures:


**Pre-Deployment Preparation:**
• Always maintain the previous version as deployable
• Document all rollback steps in the deployment plan
• Test rollback procedures in staging environment
• Keep detailed deployment history with version tags


**Emergency Rollback Procedure:**


**Step 1:** Notify the team lead immediately
**Step 2:** Check recent deployment logs and error reports
**Step 3:** Review monitoring dashboards for anomalies
**Step 4:** Execute rollback command
**Step 5:** Verify application health after rollback
**Step 6:** Document the incident for post-mortem review


**Best Practices:**
• Keep rollback window under 5 minutes
• Maintain database migration reversibility
• Use feature flags for gradual rollouts
• Always have a rollback champion on duty during deployments`,
        sources: ['s3://document-portal-storage/devops/deployment-guide.md']
      }
    }


    // Default: Not found in knowledge base
    return {
      answer: `I searched through our knowledge base but couldn't find specific information about "${question}".


This topic may not be documented yet in our system. Here's what I recommend:


**🔍 Try rephrasing your question** - Sometimes asking differently can help me find the right document.


**📚 Browse available documents** - Click the "Documents" button in the sidebar to see all available documentation.


**👥 Contact your team lead** - For topics not yet documented, your team lead can provide guidance.


**📝 Request documentation** - If this is a common question, consider requesting it be added to our knowledge base.


Would you like to ask about something else from our documentation?`,
      sources: []
    }
  }


  return (
    <div className="max-w-4xl mx-auto text-center w-full">
      <div className="mb-6">
        <div className="animate-float inline-block">
          <Bot className="w-16 h-16 mx-auto text-primary-500 mb-4" />
        </div>
      </div>


      <h2 className="text-3xl font-bold text-white mb-3">
        Welcome to DocuMind AI
      </h2>
      <p className="text-base text-text-secondary mb-8">
        Your intelligent document assistant powered by AWS Bedrock
      </p>


      {kb && kb.prompts && kb.prompts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm text-text-secondary mb-3">Try asking:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {kb.prompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handlePromptClick(prompt)}
                className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4 text-left hover:bg-dark-hover hover:border-primary-500 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-primary-500" />
                  </div>
                  <span className="text-text-primary text-sm font-medium">{prompt}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4">
          <Brain className="w-6 h-6 text-primary-500 mb-2 mx-auto" />
          <h4 className="font-semibold text-white text-sm mb-1">AI-Powered Search</h4>
          <p className="text-xs text-text-secondary">Natural language understanding</p>
        </div>


        <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4">
          <Zap className="w-6 h-6 text-yellow-500 mb-2 mx-auto" />
          <h4 className="font-semibold text-white text-sm mb-1">Instant Answers</h4>
          <p className="text-xs text-text-secondary">Get responses in seconds</p>
        </div>


        <div className="bg-dark-secondary border border-dark-tertiary rounded-lg p-4">
          <Shield className="w-6 h-6 text-secondary-500 mb-2 mx-auto" />
          <h4 className="font-semibold text-white text-sm mb-1">Secure & Private</h4>
          <p className="text-xs text-text-secondary">Your data stays protected</p>
        </div>
      </div>
    </div>
  )
}


export default WelcomeScreen
