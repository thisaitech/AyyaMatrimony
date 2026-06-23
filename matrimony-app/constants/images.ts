import { ImageSourcePropType } from 'react-native';
import { InterestStatus } from '@/constants/contactDetails';
import type { MatchGender } from '@/constants/matchFilters';

export type MemberProfile = {
  id: string;
  name: string;
  age: string;
  community: string;
  location: string;
  image: string;
  gender: MatchGender;
  badge?: string;
  verified?: boolean;
  phoneNumber: string;
  whatsappNumber?: string;
  facebookProfile?: string;
  instagramProfile?: string;
  interestStatus: InterestStatus;
};

export type PremiumProfile = {
  name: string;
  role: string;
  image: string;
  gender: MatchGender;
  premium?: boolean;
};

export const images = {
  logo: require('@/assets/lotus-logo.png') as ImageSourcePropType,
  bgIllustration: require('@/assets/bg-illustration.png') as ImageSourcePropType,
  splashCouple:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCUIoPS2XKWE3Q5sledSAHll2YgorYInvjr-bZwWC30bCzWkR-Y0hpPjAIEIXi2oOnG0vjnp8sZNzQOTBolFzOezREmsnGmX5x-nuJwJkrvr-JJ_-aII0fzWUMPay50w9kmzIbP9KwUZveMuR_Sf0uFAZhaLUuqcnIuHv_M6EDEz4RMrBvhacv9cLknJiexLYje6VklyQhAnjjYQJA_z0eGBKlyiluAjijnnq-_9I0LCdh3HV-Bg785g760u_X4xasgAaLVGn6bby4Y',
  loginWallpapers: {
    hindu:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCUIoPS2XKWE3Q5sledSAHll2YgorYInvjr-bZwWC30bCzWkR-Y0hpPjAIEIXi2oOnG0vjnp8sZNzQOTBolFzOezREmsnGmX5x-nuJwJkrvr-JJ_-aII0fzWUMPay50w9kmzIbP9KwUZveMuR_Sf0uFAZhaLUuqcnIuHv_M6EDEz4RMrBvhacv9cLknJiexLYje6VklyQhAnjjYQJA_z0eGBKlyiluAjijnnq-_9I0LCdh3HV-Bg785g760u_X4xasgAaLVGn6bby4Y',
    christian:
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1600&q=85',
  },
  tillUMarryPromo:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAvXTF-XSYl3InCvGzjgi6pAZI8Ae1WMXR5_zz4Pt0dGaGVlyQLnBTq3xv6DPHFzTlc3E9lu8XuuULZUbj3GwP_dx2qweyRzXFiEPs0t6S3IulZtyHpoSi6DDU9DojGw9mbMpAuhweVlOqrKJJmzbq-BKp6J43CTNjkyYqR8CxnQ2lSOT8g5ELwlr-jZy7-K9ZjaW2r5HvvV7pz15EqEIT2H8VD9saFUk8Zm4sTAMKEU5NuZQttCSlZNCvpfByxTLZ3rjv96_vKTAyR',
  premiumProfiles: [
    {
      name: 'Arjun Raman',
      role: 'Software Architect',
      gender: 'male',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCu1lJkM1e7OHK4g6GZvgGVbLUyf0b6pV-1DBMrfI3kzA2lX6GLcA_eGiHWTn-equ4zvcTrrl5a_GnmH2APC4ANpL9MP0U-4l7UrmVnc_LqH6MxjM5PYEKogVTKRGrs7uh7OEjdnHNuj_PJ68yQ-QWTz_vxppNjJxCjsrTAsU1Zz0Zp-Qgm0UJ8busxpZlDw86wCNbpYmWKvxyZsV7zCo2n29QPPxNwKS2Zbl33kqp5Bhu-fNpjG0eDg04LDQDYRHGKGOrAQbNRR1vI',
      premium: true,
    },
    {
      name: 'Siddharth V.',
      role: 'Medical Specialist',
      gender: 'male',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAZLg2ngRoOPmlinVk-jGYqkhLc6Oh2bc-aI6sA1TvZK_DkKZdhO549mKyhl8oHLfXUyf3susEyXiogFSvuRuEFzTVV5q6DJ6PgOqSd_q54adLHshzuxUAA0NsClPklJHWOyGQB3NBP0lAlzkQKqMjxL2jqPCOSt2zlp_GjYJWvRHTo0SC6CX8MCH2-ho8coGKAh8B2JzuW-1CL2-hyrafXNEcSpTkKmF6pqHV9AFAzMNQkEycVGY4pYCF5gatJeIdQacb5cyNFqLCU',
    },
    {
      name: 'Karthik Raja',
      role: 'Tech Lead',
      gender: 'male',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDji6MuBPDi2cTRV1h9hkAP_sGBqn8AWZeqOsrTIGefkWkZ-qMtqTa6B9khG6uN-xiYZ7biv_iKPc4uznAWfcIl7OiUWk2397ZdZtqX-fQMBo-x-BgVKVSDXI88D3H6D39vqfpqP4_NuS3RZ9DGCf34oI425bEDE9R_HbWRScZwPkliqTvl_ORzdksMds0T7gpgNdaHfuTvmcrCbYoUYUSqwP7wMpkcneg4dq5v23OrKyWQkfEd-XTnSj2UsiNFqyIWb5RO3aLVBgYl',
    },
    {
      name: 'Priya Lakshmi',
      role: 'Chartered Accountant',
      gender: 'female',
      image:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
      premium: true,
    },
    {
      name: 'Meera Devi',
      role: 'Doctor',
      gender: 'female',
      image:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=80',
    },
    {
      name: 'Anitha Raj',
      role: 'Bank Manager',
      gender: 'female',
      image:
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
    },
  ] satisfies PremiumProfile[],
  matches: [
    {
      id: '1',
      name: 'Raghavan Iyer',
      gender: 'male',
      age: '32 Years, 5\'11"',
      community: 'Iyer, Brahacharanam',
      location: 'Chennai, Tamil Nadu',
      badge: 'New',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDBcUwfn62lPYxYn7QyUYJUAIQJ9W8jBx7kI9l5lkPgekTiWNEwoIhhGJXzziYekXF6XzQbA3-q8BXLpFGv7Bv2Q-kMfEyQcmB0a1Rh-B3yVOEsnzED66_7svbKwqKjln6vaTPBe8NoUVXiOeBBcsYGRPDHSQi4J9Z4V8f8kImtqzmkL6V40iOmUjusUvgh-kv5j9OymQFWJ-mVI1YF_FXrC5tnqjy1LNi8DuJMOXPYGRzS1IOidoBNxIOqM2wlh8uG4SFnsphY02-9',
      phoneNumber: '9876543210',
      whatsappNumber: '9876543210',
      facebookProfile: 'facebook.com/raghavan.iyer',
      interestStatus: 'sent',
    },
    {
      id: '2',
      name: 'Sanjay Kumar',
      gender: 'male',
      age: '29 Years, 5\'9"',
      community: 'Pillai, Saiva Pillai',
      location: 'Madurai, Tamil Nadu',
      verified: true,
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAvXTF-XSYl3InCvGzjgi6pAZI8Ae1WMXR5_zz4Pt0dGaGVlyQLnBTq3xv6DPHFzTlc3E9lu8XuuULZUbj3GwP_dx2qweyRzXFiEPs0t6S3IulZtyHpoSi6DDU9DojGw9mbMpAuhweVlOqrKJJmzbq-BKp6J43CTNjkyYqR8CxnQ2lSOT8g5ELwlr-jZy7-K9ZjaW2r5HvvV7pz15EqEIT2H8VD9saFUk8Zm4sTAMKEU5NuZQttCSlZNCvpfByxTLZ3rjv96_vKTAyR',
      phoneNumber: '9123456789',
      whatsappNumber: '9123456789',
      instagramProfile: '@sanjay.kumar',
      interestStatus: 'mutual',
    },
    {
      id: '3',
      name: 'Vignesh Mani',
      gender: 'male',
      age: '30 Years, 5\'8"',
      community: 'Vanniyar, Kula',
      location: 'Coimbatore, Tamil Nadu',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCtZHAw3b_HPrs2IW-p8Uq6ULdS3PMCraLB5GcrMxeFsONuWreoTozEXl8K2UPfpOGkgjE1HUzI4A3q46iQFtwcOjZxXHSxrtY436EO_zkAQUFTOaTUfJXRaTOWYOWomZtgbR4BDz7Bz_ejpaOT1N5bleDKKrq5-zaJCl_ZFa8qzTPXC35qn7WbWNJm69zoWZRJyE6_057A8kmiK6Mm8rTdTirDvXtrDSjFvr6kCTOpj46KkRM1hUEpjpxCLyYYEoiWybM1kF32Wymj',
      phoneNumber: '9988776655',
      interestStatus: 'received',
    },
    {
      id: '4',
      name: 'Priya Lakshmi',
      gender: 'female',
      age: '27 Years, 5\'4"',
      community: 'Nadar, Christian Nadar',
      location: 'Chennai, Tamil Nadu',
      badge: 'New',
      verified: true,
      image:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=800&q=80',
      phoneNumber: '9000012345',
      whatsappNumber: '9000012345',
      interestStatus: 'received',
    },
    {
      id: '5',
      name: 'Meera Devi',
      gender: 'female',
      age: '25 Years, 5\'3"',
      community: 'Vanniyar, Kula',
      location: 'Madurai, Tamil Nadu',
      image:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=800&q=80',
      phoneNumber: '9000054321',
      interestStatus: 'sent',
    },
    {
      id: '6',
      name: 'Anitha Raj',
      gender: 'female',
      age: '28 Years, 5\'5"',
      community: 'Pillai, Saiva Pillai',
      location: 'Coimbatore, Tamil Nadu',
      verified: true,
      image:
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=800&q=80',
      phoneNumber: '9000098765',
      whatsappNumber: '9000098765',
      instagramProfile: '@anitha.raj',
      interestStatus: 'mutual',
    },
    {
      id: '7',
      name: 'Grace Thomas',
      gender: 'female',
      age: '26 Years, 5\'4"',
      community: 'CSI, Nadar Christian',
      location: 'Tirunelveli, Tamil Nadu',
      verified: true,
      image:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
      phoneNumber: '9000011122',
      whatsappNumber: '9000011122',
      interestStatus: 'none',
    },
  ] satisfies MemberProfile[],
};

function readUriFromAsset(asset: unknown): string | undefined {
  if (typeof asset === 'string' && asset.length > 0) {
    return asset;
  }
  if (!asset || typeof asset !== 'object') {
    return undefined;
  }
  if ('uri' in asset && typeof (asset as { uri: unknown }).uri === 'string') {
    return (asset as { uri: string }).uri;
  }
  if ('default' in asset) {
    return readUriFromAsset((asset as { default: unknown }).default);
  }
  return undefined;
}

export function getLogoUri(): string | undefined {
  return readUriFromAsset(images.logo);
}

export function getMemberProfileById(id: string): MemberProfile | undefined {
  return images.matches.find((match) => match.id === id);
}
