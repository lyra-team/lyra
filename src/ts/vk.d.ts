declare module VK {
    function init(options: {apiId: number});

    module Auth {
        enum Permission {
            AUDIO = 8
        }

        interface User {
            id: string;
            first_name: string;
            last_name: string;
            nickname: string;
            domain: string;
            href: string;
        }

        interface Session {
            mid: string;
            user?: User;
        }

        interface AuthResponse {
            session: Session;
            status: string;
        }

        function login(callback: (AuthResponse) => void, permissions: number);

        function logout(callback: () => void);

        function getLoginStatus(callback: (AuthResponse) => void);

        function getSession(): Session;
    }

    module Api {
        interface Response<T> {
            response: T
        }

        interface Audio {
            artist: string;
            title: string;
            duration: number;
            url: string;
        }

        function call(method: string, params: any, callback: (any) => void);
    }
}