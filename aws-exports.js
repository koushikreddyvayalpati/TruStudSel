const awsmobile = {
    Auth: {
        // REQUIRED - Amazon Cognito Identity Pool ID
        identityPoolId: 'YOUR_IDENTITY_POOL_ID', // e.g. 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        
        // REQUIRED - Amazon Cognito Region
        region: 'YOUR_REGION', // e.g. 'us-east-1'
        
        // OPTIONAL - Amazon Cognito User Pool ID
        userPoolId: 'YOUR_USER_POOL_ID', // e.g. 'us-east-1_xxxxxxxx'
        
        // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
        userPoolWebClientId: 'YOUR_APP_CLIENT_ID', // e.g. 'xxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
};

export default awsmobile; 