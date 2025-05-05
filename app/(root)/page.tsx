import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'
import Image from 'next/image'
import { dummyInterviews } from '@/constants'
import InterviewCard from '@/components/InterviewCard'

const page = () => {
  return (
  <>
    <section className='card-cta'>
      <div className='flex flex-col gap-6 max-w-lg'>
        <h2>Get Interview-Ready with AI-Powered Practive and Feedback</h2>
        <p>Practice on real interview questions and get instant feeback</p>
        <Button asChild className='btn-primary max-sm:w-full'>
          <Link href='/interview'>
            Start Practicing
          </Link>
        </Button>
      </div>
      <Image src="/robot.png" alt="Robot" width={400} height={400} className='max-sm:hidden' />
    </section>

    <section className='flex flex-col gap-6 mt-8'>
      <h2>Your Past Interviews</h2>
      <div className='interviews-section'>
       {dummyInterviews.map((interview) => (
        <InterviewCard {...interview} key={interview.id}/>
       ))}
       {/* <p>You have not taken any interviews yet</p> */}
      </div>
    </section>

    <section className='flex flex-col mt-8 gap-6'>
      <h2>Take an Interview</h2>
      <div className='interviews-section'>
      {dummyInterviews.map((interview) => (
        <InterviewCard {...interview} key={interview.id}/>
       ))}
      </div>
    </section>
  </>
  )
}

export default page