import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
    ExtractJwt,
    Strategy,
} from 'passport-jwt';

import { passportJwtSecret } from 'jwks-rsa';


@Injectable()
export class JwtStrategy extends PassportStrategy(
    Strategy,
    'jwt',
) {

    constructor() {

        super({

            jwtFromRequest:
                ExtractJwt.fromAuthHeaderAsBearerToken(),

            ignoreExpiration:false,


            secretOrKeyProvider:
                passportJwtSecret({

                    cache:true,

                    rateLimit:true,

                    jwksRequestsPerMinute:5,


                    jwksUri:
                    'http://localhost:44391/.well-known/jwks'

                }),

        });

    }


    validate(payload:any){
        return payload;
    }
}