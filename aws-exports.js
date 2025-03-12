const awsmobile = {
    Auth: {
        // REQUIRED - Amazon Cognito Identity Pool ID
        identityPoolId: 'us-east-2:78b5564e-3125-4350-9af5-e0a4f353b439', // e.g. 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        
        // REQUIRED - Amazon Cognito Region
        region: 'us-east-2', // e.g., 'us-east-1'
        
        // OPTIONAL - Amazon Cognito User Pool ID
        userPoolId: 'us-east-2_4iJK5Y8Zz', // e.g. 'us-east-1_xxxxxxxx'
        
        // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
        userPoolWebClientId: '28k0tme8iedpt2bfikkauij1ec', // e.g. 'xxxxxxxxxxxxxxxxxxxxxxxxxx'
        
        mandatorySignIn: true,
    }
};

export default awsmobile; 