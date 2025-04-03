const awsmobile = {
    Auth: {
        // REQUIRED - Amazon Cognito Identity Pool ID
        identityPoolId: 'us-east-2:a42d06ce-29f4-4ddb-a516-e93311fbbcde', // e.g. 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        
        // REQUIRED - Amazon Cognito Region
        region: 'us-east-2', // e.g., 'us-east-1'
        
        // OPTIONAL - Amazon Cognito User Pool ID
        userPoolId: 'us-east-2_NFqhqiTLZ', // e.g. 'us-east-1_xxxxxxxx'
        
        // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
        userPoolWebClientId: '5gs6g6t5mtscmlfoe0767mpdo4', // e.g. 'xxxxxxxxxxxxxxxxxxxxxxxxxx'
        
        mandatorySignIn: true,
    },
};

export default awsmobile; 